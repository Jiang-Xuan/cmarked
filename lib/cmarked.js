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
			codepen: noop,
			paragraph: /((?:[^\n]+\n?)+)\n*/,
			text: /^[^\n]+/,
			heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
			list: /^( *)(bull) [\s\S]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/
		}
		block.bullet = /(?:[*+-]|\d\.)/
		block.item = /( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/
		block.item = replace(block.item, 'gm')
			(/bull/g, block.bullet)
			()
		block.list = replace(block.list)
			(/bull/g, block.bullet)
			('hr', '\\n+(?=\\1(?:[*-_] *){3,}(?:\\n+|$))')
			()

		block.normal = Object.assign({}, block)

		block.dfm = Object.assign({}, block.normal, {
			codepen: /^ *@codepen +([^\n]+) *(?:\n+|$)/
		})
		/**
		 * 语法解析器
		 */
		class Parser {
			constructor(options) {
				this.tokens = []
				this.token = null
				this.renderer = options.renderer || new Renderer
				this.options = options || cmarked.default
				this.renderer.options = options || cmarked.default
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

			peek() {
				return this.tokens[this.tokens.length] || 0
			}

			parseText() {
				var body = this.token.text

				while(this.peek().type === 'text') {
					body += '\n' + this.next().text
				}

				return this.inline.output(body)
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
					case 'codepen': {
						return this.renderer.codepen(this.token.text)
					}
					case 'text': {
						return this.renderer.paragraph(this.parseText())
					}
					case 'list_start': {
						var body = ''
							, ordered = this.token.ordered

						while(this.next().type !== 'list_end') {
							body += this.tok()
						}

						return this.renderer.list(body, ordered)
					}
					case 'list_item_start': {
						var body = ''

						while(this.next().type !== 'list_item_end') {
							body += this.token.type === 'text'
								? this.parseText()
								: this.tok()
						}

						return this.renderer.listitem(body)
					}
					case 'loose_item_start': {
						let body = ''

						while(this.next().type !== 'list_item_end') {
							body += this.tok()
						}

						return this.renderer.listitem(body)
					}
				}
			}
		}

		/*
		 * 内联词法正则
		 * link 超链接
		 */
		let inline = {
			escape: /^\\[\\`*{}\[\]()#+\-.!_>]/,
			link: /^!?\[(inside)\]\(href\)/,
			autolink: /^<([^ >]+(:\/|@)[^ >]+)>/,
			code: /^(`+)\s*([\s\S]+?[^`])\s*\1(?!`)/,
			text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/,
			strong: /^__([\s\S]+?)__(?!__)|^\*\*([\s\S]+?)\*\*(?!\*)/,
			em: /^\b_((?:\\_|[^_]|__)+?)_\b|\*((?:\\\*|[^\*]|\*\*)+?)\*/
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
					, text
					, href
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

					if(cap = this.rules.strong.exec(src)) {
						debugger
						src = src.substring(cap[0].length)

						out += this.renderer.strong(this.output(cap[2] || cap[1]))

						continue
					}

					if(cap = this.rules.em.exec(src)) {
						debugger
						src = src.substring(cap[0].length)

						out += this.renderer.em(this.output(cap[1] || cap[2]))
					}

					if(cap = this.rules.autolink.exec(src)) {
						src = src.substring(cap[0].length)
						debugger
						if(cap[2] === '@') {
							text = cap[1].charAt(6) === ':'
								? this.mangle(cap[1].substring(7))
								: this.mangle(cap[1])

							href = this.mangle('mailto:') + text
						} else {
							text = escape(cap[1])
							href = text
						}

						out += this.renderer.link(href, null, text)
						continue
					}

					if(cap = this.rules.code.exec(src)) {
						src = src.substring(cap[0].length)
						out += this.renderer.codespan(cap[2])
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

			mangle(text) {
				if(!this.options.mangle) return text

				let out = ''
					, l = text.length
					, i = 0
					, ch

				for(; i < l; i++) {
					ch = text.charCodeAt(i)
					if(Math.random() > 0.5) {
						ch = 'x' + ch.toString(16)
					}
					out += '&#' + ch + ';'
				}

				return out
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

			codepen(text) {
				return '<iframe height="'
					+ this.options.codepenHeight
					+ '" scrolling="no" title="'
					+ text
					+ '" src="http://codepen.io/'
					+ this.options.codepenUsername
					+ '/embed/'
					+ text
					+ '?height='
					+ this.options.codepenHeight
					+ '&theme-id='
					+ this.options.themeId
					+ '&default-tab='
					+ this.options.defaultTab
					+ '&embed-version='
					+ this.options.embedVersion
					+ '" frameborder="no" allowtransparency="true" allowfullscreen="true" style="width: 100%;"">See the Pen <a href="http://codepen.io/'
					+ this.options.codepenUsername
					+ '/pen/'
					+ text
					+ '/">'
					+ text
					+ '</a>'
					+ ' by '
					+ this.options.codepenUsername
					+ ' (<a href="http://codepen.io/'
					+ this.options.codepenUsername
					+ '">@'
					+ this.options.codepenUsername
					+ '</a>) on <a href="http://codepen.io">CodePen</a>.'
					+ '</iframe>'
			}

			heading(text, level, id) {
				return '<h'
					+ level
					+ ' id="'
					// 这里的替换不能把不是空格的字符也捕获
					// + id.replace(/ +?[^ ]/g, this.options.gap) ✖️
					+ id.replace(/ +?(?! )/g, this.options.gap) // ✔️
					+ '">'
					+ text
					+ '</h'
					+ level
					+ '>'
			}

			code(text) {
				return '<pre><code>'
					+ text
					+ '</code></pre>'
			}

			strong(text) {
				return '<strong>'
					+ text
					+ '</strong>'
			}

			em(text) {
				return '<em>'
					+ text
					+ '</em>'
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

			list(text, ordered) {
				var bull = ordered ? 'ol' : 'ul'

				if(this.options.smartOrderList) {
					return '<'
						+ bull
						+ ' start='
						+ ordered
						+ '>'
						+ text
						+ '</'
						+ bull
						+ '>'
				}

				return '<'
					+ bull
					+ '>'
					+ text
					+ '</'
					+ bull
					+ '>'
			}

			listitem(text) {
				return '<li>' + text + '</li>'
			}

			text(text) {
				return text
			}
		}

		/**
		 * 词法解析器
		 */
		class Lexer {

			constructor(options) {
				this.tokens = []
				this.tokens.links = {}
				this.rules = block
				this.options = options || cmarked.options

				if(this.options.dfm) {
					this.rules = block.dfm
				}
			}

			static lex(src, options) {
				let lexer = new Lexer(options)
				return lexer.lex(src)
			}

			lex(src) {

				src = src
					.replace(/\r\n|\r/g, '\n')
					.replace(/\t/g, '    ')
				return this.token(src, true)
			}

			token(src, top, bq) {
				/*
				 * 解释每一个变量
				 * src 源代码
				 * cap 根据规则匹配出来的数组
				 * bull 列表符号
				 * next 未知
				 * i 循环的控制变量
				 * item 循环中的用来根据索引取出数组中的变量
				 */
				var src = src.replace(/^ +$/gm, '')
					, cap
					, bull
					, next
					, i
					, item
					, space
					, loose
					, l
					, ordered

				while(src) {
					if(cap = this.rules.newline.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'space'
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

					if(cap = this.rules.codepen.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'codepen',
							text: cap[1]
						})

						continue
					}

					if(cap = this.rules.heading.exec(src)) {
						src = src.substring(cap[0].length)
						this.tokens.push({
							type: 'heading',
							level: cap[1].length,
							text: cap[2]
						})
						continue
					}

					if(cap = this.rules.list.exec(src)) {
						src = src.substring(cap[0].length)
						bull = cap[2]
						ordered = parseInt(bull)

						this.tokens.push({
							type: 'list_start',
							ordered: ordered
						})

						// 获得每一个顶级li元素
						cap = cap[0].match(this.rules.item)

						// next = false
						l = cap.length
						i = 0

						for(; i < l; i++) {
							item = cap[i]

							space = item.length
							item = item.replace(/^ *(?:[*+-]|\d\.) +/, '')

							debugger;

							if(~item.indexOf('\n ')) {
								space -= item.length
								// pedantic 迂腐的
								// 如果关闭了此选项，marked会智能的缩进属于li里面的内容，但是我并不认为这是一个非常好的行为，因为如果我在li里面嵌套的代码块，也许会导致代码会出现不可预料的缩进行为。
								item = !this.options.pedantic
									? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
									: item.replace(/ {1,4}/gm, '')
							}
							loose = next || /\n\n(?!\s*$)/.test(item)
							if(i !== l - 1) {
								next = item.charAt(item.length - 1) === '\n'
								if(!loose) loose = next
							}
						// debugger      
							this.tokens.push({
								type: loose
									? 'loose_item_start'
									: 'list_item_start'
							})

							this.token(item, false, bq)

							this.tokens.push({
								type: 'list_item_end'
							})
						}

						this.tokens.push({
							type: 'list_end'
						})

						continue
					}

					// 顶级的p标签，只有top为true的时候才能进行该匹配
					if(top && (cap = this.rules.paragraph.exec(src))) {
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

		/*
		 * 帮助函数
		 */
		
		function escape(html, encode) {
			return html
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
		}

		function noop() {}
		noop.exec = noop;

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
			// debugger;
			return Parser.parse(Lexer.lex(src, options), options)
		}

		cmarked.setOptions = function(opt) {
			cmarked.default = Object.assign(cmarked.default, opt)
		}

		cmarked.default = {
			// h1-h6空格填充物
			gap: '-',
			smartOrderList: false,
			pedantic: true,
			codepenUsername: 'aizhizhi',
			codepenHeight: '274',
			defaultTab: 'html',
			themeId: '22001',
			embedVersion: '2',
			dfm: false,
			mangle: true
		}

		cmarked.InlineLexer = InlineLexer

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

