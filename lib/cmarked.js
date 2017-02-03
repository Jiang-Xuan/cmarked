'use strict'

;(function() {
		let block = {
			/**
			 * newline 该正则表达式匹配连续的空行，所谓空行，就是该行什么内容都没有，一个空格都没有
			 * code 该正则表达式匹配程序代码，程序代码以一个tab或者是4个空格进行缩进
			 * paragraph 该正则表达式匹配一个段落，也就是一个p标签的内容，该正则匹配一行内容以及如果一个回车之后还有内容
			 * 					 比如：ppppp\npppp 这样的情况下会被匹配并且渲染成为成一个p标签
			 * 					 pppp\n\npppp 这样的情况下，会被匹配成为两个p标签，因为正则里面的`\n?`原因
			 * 					 生成两个p标签必须在输入的内容之前插入一个空行，也就是两个回车符，
			 * 					 该正则也会匹配后面的所有空行，以方便下一次的匹配
			 * text	该正则表达式匹配单纯的内容，根据作者的意图，该正则应该是为了防止Lexer词法分析器在分析词法的时候报错
			 * heading h1-h6的正则
			 * 
			 */
			newline: /^\n+/,
			code: /^( {4}[^\n]+\n*)+/,
			paragraph: /((?:[^\n]+\n?)+)\n*/,
			text: /^[^\n]+/,
			heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/
		}
		/**
		 * 语法解析器
		 */
		class Parser {
			constructor(options) {
				this.tokens = []
				this.token = null
				this.renderer = options.renderer || new Renderer
				this.options = options || cmarked.default
			}

			static parse(src, options) {
				let parser = new Parser(options)
				return parser.parse(src)
			}

			parse(src) {
				this.inline = new InlineLexer(src.links, this.options)
				this.tokens = src.reverse()

				let out = ''
				// 用while循环逐个处理
				while(this.next()) {
					out += this.tok()
				}
				return out
			}

			next() {
				return this.token = this.tokens.pop()
			}
			tok() {
				switch(this.token.type) {
					case 'space': {
						return ''
					}
					case 'heading': {
						return this.renderer.heading(this.inline.output(this.token.text), this.token.level, this.token.text)
					}
					case 'code': {
						return this.renderer.code(this.token.text)
					}
					case 'paragraph': {
						return this.renderer.paragraph(this.inline.output(this.token.text))
					}
					case 'text': {
						return this.renderer.text(this.token.text)
					}
				}
			}
		}

		/*
		 * 内联词法正则
		 * link 超链接
		 */
		let inline = {
			link: /^!?\[(inside)\]\(href\)/,
			code: /^(`+)\s*([\s\S]+?[^`])\s*\1(?!`)/,
			text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
		}
		inline._inside = /.*?/
		inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]+?)['"])?\s*/
		inline.link = replace(inline.link)
			('inside', inline._inside)
			('href', inline._href)
			()
		inline.normal = Object.assign({}, inline)

		/**
		 * 内联词法解析器
		 */
		class InlineLexer {
			constructor(links, options) {
				this.options = options
				this.links = links
				this.rules = inline.normal
				this.renderer = options.renderer || new Renderer
			}

			output(src) {
				var out = ''
					, cap
				while(src) {
					if(cap = this.rules.link.exec(src)) {
						// cap[0]是全部匹配的内容
						// cap[1]是捕获到的链接的内容
						// cap[2]是捕获到的链接
						// cap[3]是捕获到的链接的title
						src = src.substring(cap[0].length)
						out += this.outputLink(cap, {
							href: cap[2],
							title: cap[3]
						})
						continue
					}

					if(cap = this.rules.code.exec(src)) {
						src = src.substring(cap[0].length)
						out += this.renderer.codespan(cap[2])
						debugger;
						continue
					}

					if(cap = this.rules.text.exec(src)) {
						src = src.substring(cap[0].length)
						out += this.renderer.text(cap[0])
						continue
					}

					if(src) {
						throw new Error('Too much recursion.')
					}
				}

				return out
			}

			outputLink(cap, link) {
				var href = link.href
					, title = link.title

				return this.renderer.link(href, title, cap[1])
			}
		}
		/**
		 * 渲染器
		 */
		class Renderer {
			constructor(options) {
				this.options = options || cmarked.default
			}

			paragraph(text) {
				return '<p>' + text + '</p>\n'
			}

			heading(text, level, id) {
				return '<h'
					+ level
					+ ' id="'
					+ id.replace(/ /g, this.options.gap)
					+ '">'
					+ text
					+ '</h'
					+ level
					+ '>'
			}

			code(text) {
				return '<pre><code>'
					+ text
					+ '</code><pre>'
			}

			link(href, title, text) {
				let out = '<a href="' + href + '"'

				if(title) {
					out += ' title="' + title + '"'
				}
				out += '>' + text + '</a>'

				return out
			}

			codespan(text) {
				return '<code>' + text + '</code>'
			}

			text(text) {
				return text
			}
		}

		/**
		 * 词法解析器
		 */
		class Lexer {

			constructor() {
				this.tokens = []
				this.tokens.links = {}
				this.rules = block
			}

			static lex(src) {
				let lexer = new Lexer()
				return lexer.lex(src)
			}

			lex(src) {

				src = src
					.replace(/\r\n|\r/g, '\n')
					.replace(/\t/g, '    ')
				return this.token(src)
			}

			token(src) {
				var src = src.replace(/^ +$/gm, '')
					, cap

				while(src) {
					if(cap = this.rules.newline.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'space'
						})
					}

					if(cap = this.rules.heading.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'heading',
							level: cap[1].length,
							text: cap[2]
						})
					}

					if(cap = this.rules.code.exec(src)) {
						src = src.substring(cap[0].length)
						cap = cap[0].replace(/^ {4}/gm, '')
						this.tokens.push({
							type: 'code',
							text: cap
						})
						continue
					}

					if(cap = this.rules.paragraph.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'paragraph',
							text: cap[1].charAt(cap[1].length - 1) === '\n'
								? cap[1].slice(0, -1)
								: cap[1]
						})
						continue
					}

					if(cap = this.rules.text.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'text',
							text: cap[0]
						})
						continue
					}

					if(src) {
						throw new Error('too much recursion.')
					}
				}
				return this.tokens;
			}

		}

		function replace(regex, opt) {
			regex = regex.source
			opt = opt || ''
			return function self(name, val) {
				if(!name) return new RegExp(regex, opt)
				val = val.source || val
				// val = val.replace(/(^|[^\[])\^/g, '$1')
				regex = regex.replace(name, val)

				return self
			}
		}

		function cmarked(src, options) {
			if(!options) options = cmarked.default
			debugger;
			return Parser.parse(Lexer.lex(src, options), options)
		}
		cmarked.default = {
			// h1-h6空格填充物
			gap: '-'
		}

		/**
		 * 调用cmarked → 将源码传递给词法解析器Lexer.lex → 词法解析器将自己解析的结果交给语法解析器Parser.parse
		 * 
		 */

		/**
		 * # 向外暴露出接口
		 */	
		if(typeof module !== 'undefined' && typeof exports === 'object') {
			module.exports = cmarked
		} else if(typeof define === 'object' && define.amd) {
			define(function() { return cmarked })
		} else {
			this.cmarked = cmarked
		}
}).call(function() {
	return this || (typeof window !== 'undefined' ? window : global)
}())

