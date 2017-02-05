	'use strict'

	var cmarked = require('../lib/cmarked')
	var expect = require('chai').expect

	describe('markdown编译器cmarked的整体测试', function() {
		// 单独的每一个markdown块的单元测试
		it('应该输出带有id的h1-h6的标题标签', function() {
			let string = randomString()
			expect(cmarked(`# ${string}`)).to.be.equal(`<h1 id="${string}">${string}</h1>`)
		})
		it('应该输出代码块标签', function() {
			let code = `\tlet jiang = new JiangXuan\n\tjiang.sex = man`
			expect(cmarked(code)).to.be.equal('<pre><code>let jiang = new JiangXuan\njiang.sex = man</code></pre>')
		})
		// 单独的每一个markdown块的单元测试 End
	})


	function randomString(len) {
		var len = len || 32
		var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
		var maxPos = chars.length
		var pwd = ''
		var i = 0
		for(; i < len; i++) {
			pwd += chars.charAt(Math.floor(Math.random() * maxPos))
		}

		return pwd
	}