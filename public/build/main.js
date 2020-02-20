'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var electron = _interopDefault(require('electron'));

const app = electron.app || electron.remote.app;

const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
const getFromEnv = parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

var electronIsDev = isEnvSet ? getFromEnv : !app.isPackaged;

// Extracted from https://github.com/jshttp/mime-db/blob/master/db.json

var videoExtensionsList = [
	"3g2",
	"3gp",
	"3gpp",
	"asf",
	"asx",
	"avi",
	"dvb",
	"f4v",
	"fli",
	"flv",
	"fvt",
	"h261",
	"h263",
	"h264",
	"jpgm",
	"jpgv",
	"jpm",
	"m1v",
	"m2v",
	"m4u",
	"m4v",
	"mj2",
	"mjp2",
	"mk3d",
	"mks",
	"mkv",
	"mng",
	"mov",
	"movie",
	"mp4",
	"mp4v",
	"mpe",
	"mpeg",
	"mpg",
	"mpg4",
	"mxu",
	"ogv",
	"pyv",
	"qt",
	"smv",
	"ts",
	"uvh",
	"uvm",
	"uvp",
	"uvs",
	"uvu",
	"uvv",
	"uvvh",
	"uvvm",
	"uvvp",
	"uvvs",
	"uvvu",
	"uvvv",
	"viv",
	"vob",
	"webm",
	"wm",
	"wmv",
	"wmx",
	"wvx",
];

// Modules to control application life and create native browser window
const { app: app$1, BrowserWindow, dialog, Menu } = electron;



// if (isDev) {
// 	require('electron-reloader')(module)
// }

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		backgroundColor: '#eef5ff',
		show: false,
		width: electronIsDev ? 1300 : 800, // wider in dev mode so there's room for dev tools
		height: 600,
		minWidth: 400,
		minHeight: 300,
		webPreferences: {
			nodeIntegration: true
		},
		// icon: './icon/icon.png',
	});
	Menu.setApplicationMenu(null);

	// and load the index.html of the app.
	mainWindow.loadFile('public/index.html');

	// Open the DevTools.
	if (electronIsDev) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
	});

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app$1.on('ready', createWindow);

// Quit when all windows are closed.
app$1.on('window-all-closed', function () {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app$1.quit();
	}
});

app$1.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function selectExeFile() {
	return dialog.showOpenDialog(mainWindow, {
		filters: [
			{ name: 'Executable', extensions: [ 'exe' ] }
		],
		properties: [
			'openFile'
		]
	})
}
function selectVideoFile() {
	return dialog.showOpenDialog(mainWindow, {
		filters: [
			{ name: 'Video', extensions: videoExtensionsList }
		],
		properties: [
			'openFile'
		]
	})
}

var selectExeFile_1 = selectExeFile;
var selectVideoFile_1 = selectVideoFile;

var main = {
	selectExeFile: selectExeFile_1,
	selectVideoFile: selectVideoFile_1
};

exports.default = main;
exports.selectExeFile = selectExeFile_1;
exports.selectVideoFile = selectVideoFile_1;
//# sourceMappingURL=main.js.map
