'use strict'

let cmarked = require('../lib/cmarked')
let expect = require('chai').expect
let fs = require('fs')

describe('markdown编译器cmarked的每一个功能的单独测试', function() {
	// 单独的每一个markdown块的单元测试
	it('输出带有id的h1-h6的标题标签', function() {
		let resourceObj = randomHeader()
		let string = resourceObj.resource
		let level = resourceObj.level
		let content = resourceObj.content
		expect(cmarked(string)).to.be.equal(`<h${level} id="${content}">${content}</h${level}>`)
	})

	it('输出代码块标签', function() {
		let code = fs.readFileSync('./testcode.js')
		code = code.toString().replace(/\t/gm, '    ')
		let exp = code.replace(/^ {4}/gm, '')
		expect(cmarked(code)).to.be.equal(`<pre><code>${exp}</code></pre>`)
	})

	it('输出段落标签', function() {
		let string = randomString(16)
		expect(cmarked(string)).to.be.equal(`<p>${string}</p>\n`)
	})
	// 单独的每一个markdown块的单元测试 End
})


function randomString(len) {
	len = len || 32
	let chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678零一二三四五六七八九'
		, maxPos = chars.length
		, pwd = ''
		, i = 0
	for(; i < len; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * maxPos))
	}

	return pwd
}

function randomHeader() {
	let level = randomMintoMaxNum(1, 6)
		, levelString = '#'.repeat(level)
		, content = randomString()

	return {
		resource: levelString + ' ' + content + '#'.repeat(randomMintoMaxNum(0, 100)),
		content: content,
		level: level
	}
}

function randomMintoMaxNum(min, max) {
	return Math.floor(Math.random() * (max - min)) + min
}