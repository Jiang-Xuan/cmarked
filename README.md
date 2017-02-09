# cmarked

更符合中文的markdown编译器

## 安装

	npm install cmarked

## 使用方法

最小的使用

```js
	var cmarked = require('cmarked')
	console.log(cmarked('**我正在使用markdown语法书写文章**'))
	//输出 <p><strong>我正在使用markdown语法书写文章</strong></p>
```

设置选项的例子，用默认值来示例：

```js
	var cmarked = require('cmarked')
	cmarked.setOptions({
		gap: '-',
		smartOrderList: false
	})
```

### Options

### gap

Type:`String`

h1-h6标题的id中的空格的填充符

例子

```js
	var cmarked = require('cmarked')
	console.log(cmarked('# cmarked爱你'))
	//输出 <h1 id='cmarked爱你'>cmarked爱你</h1>
	console.log(cmarked('## cmarked 还 是 爱 你'))
	//输出 <h2 id='cmarked-还-是-爱-你'>cmarked 还 是 爱 你</h2>
```

自定义填充符

```js
	var cmarked = require('cmarked')
	cmarked.setOptions({
		gap: '~'
	})
	console.log(cmarked('### cmarked 依  旧  爱 你'))
	//输出 <h3 id='cmarked~依~旧~爱~你'>cmarked 依  旧  爱 你</h3>
	// 连续的空格只会生成一个填充符
```

### smarkOrderList

type: `Boolean` default: `false`

是否使用智能的的有序列表，如果你的有序列表想要从不是1开头的，需要开启此选项。注意，原生的markdown并不支持此语法。

例子 - 不开启智能有序列表

```js
	var cmarked = require('cmarked')
	console.log(cmarked('3. cmarked\n4. cmarked'))
	//输出效果
	//1. cmarked
	//2. cmarked
```

例子 - 开启智能有序列表

```js
	var cmarked = require('cmarked')
	console.log(cmarked('3. cmarked\n4. cmarked'))
	//输出效果
	//3. cmarked
	//4. cmarked
```


目前该JavaScript包处于开发阶段，只在我的博客网站上面进行试用<http://www.jiangxuan.org>

如果你是开发者，请阅读dev.md




