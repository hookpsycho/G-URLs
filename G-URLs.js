// ==UserScript==
// @name         G-URLs
// @version      2.0.1
// @description  Extract clean URLs from Google Search results
// @author       0hook
// @match        *www.google.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.11/clipboard.min.js
// @run-at       document-end
// @icon         https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png
// @updateURL    https://github.com/0hook/G-URLs/raw/main/G-URLs.js
// @downloadURL  https://github.com/0hook/G-URLs/raw/main/G-URLs.js
// ==/UserScript==

(() => {
	const PREFIX = atob('Z2l0aHViLmNvbS8waG9vaw==') + '\t'
	const STORAGE_CLEANUP = 665
	const EVENT_LISTENER = 301
	const STORAGE_ITEMS = [
		'sb_wiz.zpc.gws-wiz-serp.',
		'_grecaptcha'
	]

	function URLEncoded(uri) {
		if (typeof uri !== 'string') return false
		try {
			return URLComponent(uri) !== uri
		} catch {
			return false
		}
	}

	function log(message, type = 'info') {
		const Prefix = `${PREFIX}${message}`
		switch (type) {
			case 'error':
				console.error(Prefix)
				break
			case 'warn':
				console.warn(Prefix)
				break
			default:
				console.log(Prefix)
		}
	}

	function CleanStorage() {
		if (!window?.localStorage) return

		const interval = setInterval(() => {
			if (!STORAGE_ITEMS.length) {
				clearInterval(interval)
				return
			}

			STORAGE_ITEMS.forEach(item => {
				if (localStorage.getItem(item) !== null) {
					localStorage.removeItem(item)
					log(`Removed item "${item}" from window.localStorage`)
				}
			})
		}, STORAGE_CLEANUP)
	}

	function Tracking() {
		setTimeout(() => {
			try {
				const selector = 'div#search>div'
				const oldDiv = document.querySelector(selector)

				if (!oldDiv) {
					log(`Unable to find CSS selector: "${selector}"`, 'warn')
					return
				}

				oldDiv.dataset.hveid = ''
				oldDiv.dataset.ved = ''
				const newDiv = oldDiv.cloneNode(true)
				oldDiv.parentNode.replaceChild(newDiv, oldDiv)
				log(`Removed all event listeners for CSS selector: "${selector}"`)
			} catch (err) {
				log(`Error removing event listeners: ${err.message}`, 'error')
			}
		}, EVENT_LISTENER)
	}

	function SearchBox() {
		const div = document.querySelector('#rso div>div>div[data-initq]')
		if (div) {
			div.remove()
			return true
		}
		return false
	}

	function URLProcess(url) {
		if (!url) return null

		let URLProcessed = url
			.replace(/^\/url\?(?:.*)?url=/g, '')
			.replace(/(?:&ved=[A-Za-z0-9_-]{10,60})?(?:&cshid=[0-9]*)?$/g, '')
			.trim()

		if (URLEncoded(URLProcessed)) {
			URLProcessed = URLComponent(URLProcessed)
			log(`Decoded URI components for "${URLProcessed}"`)
		}

		return URLProcessed
	}

	function Results(text) {
		const container = document.createElement('div')
		container.classList.add('url-scraper__container')

		const textarea = document.createElement('textarea')
		textarea.classList.add('url-scraper__textarea')
		textarea.textContent = text
		textarea.id = 'url-scraper__urls'

		const copyButton = document.createElement('button')
		copyButton.dataset.clipboardAction = 'copy'
		copyButton.dataset.clipboardTarget = '#url-scraper__urls'
		copyButton.textContent = 'Copy to clipboard'

		const styles = `
			.url-scraper__container {
				position: fixed;
				top: 80px;
				right: 20px;
				width: 450px;
				height: auto;
				max-height: 400px;
				padding: 15px;
				display: flex;
				flex-direction: column;
				gap: 8px;
				background: #1a1a1a;
				border: 1px solid #333;
				border-radius: 8px;
				overflow-y: auto;
				box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
				z-index: 1000;
			}
			.url-scraper__textarea {
				width: 100%;
				height: 300px;
				font-family: monospace;
				display: block;
				background: #2d2d2d;
				padding: 10px;
				border: 1px solid #333;
				border-radius: 6px;
				font-size: 12px;
				line-height: 1.4;
				resize: none;
				box-sizing: border-box;
				color: #e0e0e0;
			}
			.url-scraper__textarea:focus {
				outline: none;
				border-color: #4a4a4a;
			}
			.url-scraper__container button {
				width: 100%;
				font-size: 13px;
				padding: 6px 12px;
				font-family: 'Verdana', sans-serif;
				border: none;
				border-radius: 6px;
				background: #2d2d2d;
				color: #ffffff;
				cursor: pointer;
				transition: all 0.2s ease;
				text-align: center;
				border: 1px solid #333;
			}
			.url-scraper__container button:hover {
				background: #3d3d3d;
			}
		`

		const styleSheet = document.createElement('style')
		styleSheet.textContent = styles
		document.head.appendChild(styleSheet)

		try {
			const clipboard = new ClipboardJS(copyButton)
			clipboard.on('success', () => log('Successfully copied text to clipboard'))
			clipboard.on('error', (err) => log(`Clipboard error: ${err.message}`, 'warn'))
		} catch (err) {
			log(`Clipboard initialization error: ${err.message}`, 'error')
		}

		container.appendChild(textarea)
		container.appendChild(copyButton)

		document.body.appendChild(container)
	}

	async function URLSScrape() {
		try {
			await SearchBox()
			const links = document.querySelectorAll('#search div>div>div>a[href]')

			if (!links.length) {
				log('No URLs found on page', 'warn')
				return
			}

			let urls = ''

			links.forEach(link => {
				if (!link) return

				let url = ''
				if (link.getAttribute('ping')) {
					url = URLProcess(link.getAttribute('ping'))
					log('Parsed attribute "ping"')
				} else if (link.getAttribute('href')) {
					url = link.href.trim()
					log('Extracted attribute "href"')
				} else {
					log('Unable to find URL attributes ["ping", "href"]', 'warn')
					return
				}

				link.ping = ''
				link.href = url
				link.target = '_blank'

				const parentDiv = link.parentElement?.parentElement?.parentElement?.parentNode
				if (parentDiv) {
					parentDiv.dataset.ved = ''
					parentDiv.dataset.hveid = ''
					parentDiv.dataset.jscontroller = ''
					parentDiv.dataset.jsaction = ''
				}

				urls += `${url}\n`
			})

			if (urls) {
				Results(urls)
				await Tracking()
			}

			const rso = document.getElementById('rso')
			if (rso?.getAttribute('eid')) {
				rso.removeAttribute('eid')
				log('Removed eid attribute from RSO element')
			}

		} catch (err) {
			log(`Error during URL scraping: ${err.message}`, 'error')
		}
	}

	console.clear()
	CleanStorage()
	URLSScrape()
})()