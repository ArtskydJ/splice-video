'use strict';

function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

/* app\App.svelte generated by Svelte v3.18.2 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	child_ctx[12] = i;
	return child_ctx;
}

// (98:3) {#if i != 0}
function create_if_block(ctx) {
	let button;
	let dispose;

	function click_handler_1(...args) {
		return /*click_handler_1*/ ctx[9](/*i*/ ctx[12], ...args);
	}

	return {
		c() {
			button = element("button");
			button.textContent = "⨇ merge up";
		},
		m(target, anchor) {
			insert(target, button, anchor);
			dispose = listen(button, "click", click_handler_1);
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
		},
		d(detaching) {
			if (detaching) detach(button);
			dispose();
		}
	};
}

// (92:1) {#each pairedClips as pair, i}
function create_each_block(ctx) {
	let div;
	let button;

	let t0_value = (/*checked*/ ctx[1][/*i*/ ctx[12]]
	? "✔ included"
	: "✘ not included") + "";

	let t0;
	let t1;
	let t2_value = /*pair*/ ctx[10][0].toFixed(2) + "";
	let t2;
	let t3;
	let t4_value = /*pair*/ ctx[10][1].toFixed(2) + "";
	let t4;
	let t5;
	let t6;
	let dispose;

	function click_handler(...args) {
		return /*click_handler*/ ctx[8](/*i*/ ctx[12], ...args);
	}

	let if_block = /*i*/ ctx[12] != 0 && create_if_block(ctx);

	return {
		c() {
			div = element("div");
			button = element("button");
			t0 = text(t0_value);
			t1 = space();
			t2 = text(t2_value);
			t3 = text(" - ");
			t4 = text(t4_value);
			t5 = space();
			if (if_block) if_block.c();
			t6 = space();
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button);
			append(button, t0);
			append(div, t1);
			append(div, t2);
			append(div, t3);
			append(div, t4);
			append(div, t5);
			if (if_block) if_block.m(div, null);
			append(div, t6);
			dispose = listen(button, "click", click_handler);
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*checked*/ 2 && t0_value !== (t0_value = (/*checked*/ ctx[1][/*i*/ ctx[12]]
			? "✔ included"
			: "✘ not included") + "")) set_data(t0, t0_value);

			if (dirty & /*pairedClips*/ 4 && t2_value !== (t2_value = /*pair*/ ctx[10][0].toFixed(2) + "")) set_data(t2, t2_value);
			if (dirty & /*pairedClips*/ 4 && t4_value !== (t4_value = /*pair*/ ctx[10][1].toFixed(2) + "")) set_data(t4, t4_value);
			if (/*i*/ ctx[12] != 0) if_block.p(ctx, dirty);
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			dispose();
		}
	};
}

function create_fragment(ctx) {
	let video_1;
	let video_1_src_value;
	let t0;
	let div0;
	let button0;
	let t2;
	let div1;
	let button1;
	let t4;
	let div2;
	let t5;
	let textarea;
	let dispose;
	let each_value = /*pairedClips*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			video_1 = element("video");
			t0 = space();
			div0 = element("div");
			button0 = element("button");
			button0.textContent = "⌨ Keyboard Shortcuts";
			t2 = space();
			div1 = element("div");
			button1 = element("button");
			button1.textContent = "✂ Split";
			t4 = space();
			div2 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t5 = space();
			textarea = element("textarea");
			if (video_1.src !== (video_1_src_value = src)) attr(video_1, "src", video_1_src_value);
			video_1.controls = true;
			attr(video_1, "class", "svelte-apkb0m");
			textarea.value = /*command*/ ctx[3];
			attr(textarea, "class", "svelte-apkb0m");
		},
		m(target, anchor) {
			insert(target, video_1, anchor);
			insert(target, t0, anchor);
			insert(target, div0, anchor);
			append(div0, button0);
			insert(target, t2, anchor);
			insert(target, div1, anchor);
			append(div1, button1);
			insert(target, t4, anchor);
			insert(target, div2, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div2, null);
			}

			insert(target, t5, anchor);
			insert(target, textarea, anchor);

			dispose = [
				listen(button0, "click", showKeyboardShortcuts),
				listen(button1, "click", /*cut*/ ctx[4])
			];
		},
		p(ctx, [dirty]) {
			if (dirty & /*sortedClips, pairedClips, checked*/ 7) {
				each_value = /*pairedClips*/ ctx[2];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div2, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*command*/ 8) {
				textarea.value = /*command*/ ctx[3];
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(video_1);
			if (detaching) detach(t0);
			if (detaching) detach(div0);
			if (detaching) detach(t2);
			if (detaching) detach(div1);
			if (detaching) detach(t4);
			if (detaching) detach(div2);
			destroy_each(each_blocks, detaching);
			if (detaching) detach(t5);
			if (detaching) detach(textarea);
			run_all(dispose);
		}
	};
}

let src = "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4f/CanoeTacking.webm/CanoeTacking.webm.480p.vp9.webm";

function showKeyboardShortcuts() {
	alert([
		"[space]\tPlay/Pause",
		"<\t\tBack 15 seconds",
		">\t\tForward 15 seconds",
		",\t\tBack 1 frame",
		".\t\tForward 1 frame"
	].join("\n"));
}

function instance($$self, $$props, $$invalidate) {
	let video;
	let sortedClips = [0, 25.68];
	let checked = {};
	let commands = [];

	setTimeout(
		function () {
			video = document.querySelector("video");
		},
		0
	);

	function cut() {
		sortedClips.push(video.currentTime);

		sortedClips.sort(function (a, b) {
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		});

		$$invalidate(0, sortedClips = sortedClips); // trigger reactivity: https://svelte.dev/tutorial/updating-arrays-and-objects
	}

	const click_handler = i => {
		$$invalidate(1, checked[i] = !checked[i], checked);
	};

	const click_handler_1 = i => {
		$$invalidate(0, sortedClips = sortedClips.filter((clip, j) => j !== i));
	};

	let extension;
	let pairedClips;
	let command;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*checked*/ 2) {
			 {
				console.log(checked);
			}
		}

		if ($$self.$$.dirty & /*sortedClips*/ 1) {
			 $$invalidate(2, pairedClips = sortedClips.reduce(
				(memo, currClip, i, arr) => {
					if (i === 0) {
						return [];
					}

					let prevClip = arr[i - 1];

					if (prevClip !== currClip) {
						memo.push([prevClip, currClip]);
					}

					return memo;
				},
				[]
			));
		}

		if ($$self.$$.dirty & /*pairedClips, checked, extension, commands*/ 198) {
			 {
				$$invalidate(6, commands = pairedClips.filter((clip, i) => {
					return checked[i];
				}).map((clip, i) => {
					return `ffmpeg -i "${src}" -c copy -ss ${clip[0].toFixed(2)} -t ${(clip[1] - clip[0]).toFixed(2)} tmp${i}.${extension}`;
				}));

				if (commands.length === 0) ; else if (commands.length === 1) {
					$$invalidate(6, commands[0] = commands[0].replace(/tmp0\.(.{2,5})$/, "output.$1"), commands);
				} else {
					let tmpfilenames = commands.map((cmd, i) => {
						return `tmp${i}.${extension}`;
					}).join("|");

					commands.push(`ffmpeg -i "concat:${tmpfilenames}" -c copy output.${extension}`);
				}

				$$invalidate(6, commands = commands); // trigger reactivity: https://svelte.dev/tutorial/updating-arrays-and-objects (might not be necessary here)
			}
		}

		if ($$self.$$.dirty & /*commands*/ 64) {
			 $$invalidate(3, command = commands.join("\n"));
		}
	};

	 $$invalidate(7, extension = src.split(".").pop());

	return [
		sortedClips,
		checked,
		pairedClips,
		command,
		cut,
		video,
		commands,
		extension,
		click_handler,
		click_handler_1
	];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

var app = new App({
	target: document.body
});

module.exports = app;
//# sourceMappingURL=renderer.js.map
