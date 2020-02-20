<script>	
	let src = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4f/CanoeTacking.webm/CanoeTacking.webm.480p.vp9.webm'
	$: extension = src.split('.').pop()
	
	let video
	let sortedClips = [0, 25.68]
	
	let checked = {}
	
	$: {
		console.log(checked)
	}
	
	$: pairedClips = sortedClips
		.reduce((memo, currClip, i, arr) => {
			if (i === 0) { return [] }
			let prevClip = arr[i - 1]
			if (prevClip !== currClip) {
				memo.push([ prevClip, currClip ])
			}
			return memo
		}, [])
	
	let commands = []
	
  $: {
		commands = pairedClips
		.filter((clip, i) => {
			return checked[i]
		})
		.map((clip, i) => {
			return `ffmpeg -i "${src}" -c copy -ss ${clip[0].toFixed(2)} -t ${(clip[1] - clip[0]).toFixed(2)} tmp${i}.${extension}`
		})
		
		if (commands.length === 0) {
		} else if (commands.length === 1) {
			commands[0] = commands[0].replace(/tmp0\.(.{2,5})$/, 'output.$1')
		} else {
			let tmpfilenames = commands.map((cmd, i) => {
				return `tmp${i}.${extension}`
			}).join('|')
			commands.push(`ffmpeg -i "concat:${tmpfilenames}" -c copy output.${extension}`)
		}
		commands = commands // trigger reactivity: https://svelte.dev/tutorial/updating-arrays-and-objects (might not be necessary here)
	}
	
	$: command = commands.join('\n')
	
	setTimeout(function () { video = document.querySelector('video') }, 0)
	
	function cut() {
		sortedClips.push( video.currentTime )
		sortedClips.sort(function (a, b) {
			if (a < b) return -1
			if (a > b) return 1
			return 0
		})
		sortedClips = sortedClips // trigger reactivity: https://svelte.dev/tutorial/updating-arrays-and-objects
	}
	
	function showKeyboardShortcuts () {
		alert([
			'[space]\tPlay/Pause',
			'<\t\tBack 15 seconds',
			'>\t\tForward 15 seconds',
			',\t\tBack 1 frame',
			'.\t\tForward 1 frame',
		].join('\n'))
		
	}
</script>

<style>
	textarea {
		/*white-space: nowrap;*/
		width: 100%;
	}
	video {
		width: 100%;
		display: block;
	} 
</style>

<video {src} controls></video>
<div>
	<button on:click={showKeyboardShortcuts}>⌨ Keyboard Shortcuts</button>
</div>
<div>
	<button on:click={cut}>✂ Split</button>
</div>
<div>
	{#each pairedClips as pair, i}
		<div>
			<button on:click={() => { checked[i] = !checked[i]}}>
				{checked[i] ? '✔ included' : '✘ not included'}
			</button>
			{pair[0].toFixed(2)} - {pair[1].toFixed(2)}
			{#if i != 0}
				<button on:click={() => { sortedClips = sortedClips.filter((clip, j) => j !== i) }}>
					⨇ merge up
				</button>
			{/if}
		</div>
	{/each}
</div>
<textarea>{command}</textarea>


