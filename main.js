// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, Menu } = require('electron')
const isDev = require('electron-is-dev')
const videoExtensions = require('./app/video-extensions-list.js')

if (isDev) {
	require('electron-reloader')(module)
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		backgroundColor: '#eef5ff',
		show: false,
		width: isDev ? 1300 : 800, // wider in dev mode so there's room for dev tools
		height: 600,
		minWidth: 400,
		minHeight: 300,
		webPreferences: {
			nodeIntegration: true
		},
		// icon: './icon/icon.png',
	})
	Menu.setApplicationMenu(null)

	// and load the index.html of the app.
	mainWindow.loadFile('app/index.html')

	// Open the DevTools.
	if (isDev) {
		mainWindow.webContents.openDevTools()
	}

	mainWindow.on('ready-to-show', () => {
		mainWindow.show()
	})

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null
	})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

exports.selectExeFile = function() {
	return dialog.showOpenDialog(mainWindow, {
		filters: [
			{ name: 'Executable', extensions: [ 'exe' ] }
		],
		properties: [
			'openFile'
		]
	})
}
exports.selectVideoFile = function() {
	return dialog.showOpenDialog(mainWindow, {
		filters: [
			{ name: 'Video', extensions: videoExtensions }
		],
		properties: [
			'openFile'
		]
	})
}
