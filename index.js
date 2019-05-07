const puppeteer = require('puppeteer')
let enList = []
const app = async () => {
  console.log('loading....')
  const browser = await (puppeteer.launch({
  //设置超时时间
  timeout: 15000,
  //如果是访问https页面 此属性会忽略https错误
  ignoreHTTPSErrors: true,
  // 打开开发者工具, 当此值为true时, headless总为false
  devtools: false,
  // 关闭headless模式, 不会打开浏览器
  headless: true
}))
  const page = await browser.newPage()
  await page.goto('http://kcb.sse.com.cn/renewal/')

  // 先解析第一页
  const tempArr = await page.evaluate(() => {
    var list = document.querySelectorAll('tr.data')
    let tempArr = []
    list.forEach(tr => {
      var temp = {}
      tr.querySelectorAll('td').forEach((item, index) => {
        const tdTitle = ['序号', '发行人全称', '审核状态', '注册地', '证监会行业', '保荐机构', '律师事务所', '会计师事务所', '更新日期', '受理日期']
        temp[`${tdTitle[index]}`] = item.innerText
        if (index === 1) {
          const re = /<a[^>]*href=['"]([^"]*)['"][^>]*>(.*?)<\/a>/g;
          if (re.exec(item.innerHTML) != null) {
            temp[`${tdTitle[index]}:href`] = 'http://kcb.sse.com.cn' + decodeURIComponent(RegExp.$1)
          }
        }
      })
      tempArr.push(temp)
    })
    return tempArr
  })
  enList.push(...tempArr)

  // 按下一页并解析
  // 当页面上不存在下一页时，退出循环
  while(true) {
    const nextPageSelector = '.paging_next'
    const nextPageDom = await page.$(nextPageSelector)
    if (nextPageDom) {
      await page.click(nextPageSelector)
      const resultsSelector = 'tr.data';
      await page.waitForSelector(resultsSelector);
      const newPageData = await page.evaluate(() => {
        var list = document.querySelectorAll('tr.data')
        let tempArr = []
        list.forEach(tr => {
          var temp = {}
          tr.querySelectorAll('td').forEach((item, index) => {
            const tdTitle = ['序号', '发行人全称', '审核状态', '注册地', '证监会行业', '保荐机构', '律师事务所', '会计师事务所', '更新日期', '受理日期']
            temp[`${tdTitle[index]}`] = item.innerText
            if (index === 1) {
              const re = /<a[^>]*href=['"]([^"]*)['"][^>]*>(.*?)<\/a>/g;
              if (re.exec(item.innerHTML) != null) {
                temp[`${tdTitle[index]}:href`] = 'http://kcb.sse.com.cn' + decodeURIComponent(RegExp.$1)
              }
            }
          })
          tempArr.push(temp)
        })
        return tempArr
      })
      enList.push(...newPageData)
    } else {
      break
    }
  }

  // 遍历企业信息，跳转至详情页获取信息
  for(let i = 0; i < enList.length; i++) {
    const url = enList[i]['发行人全称:href']
    try {
      await page.goto(url, {
        waitUntil: 'load'
      })
      const temp = await page.evaluate(() => {
        let temp = {}
        temp['公司全称'] = document.getElementById('issuer_full').innerText
        temp['受理日期'] = document.getElementById('applyDate').innerText
        temp['公司简称'] = document.getElementById('issuer_sec').innerText
        temp['融资金额(亿元)'] = document.getElementById('type').innerText
        temp['审核状态'] = document.getElementById('status').innerText
        temp['更新日期'] = document.getElementById('updateDate').innerText
        temp['保荐机构'] = document.getElementById('sponsor_org').innerText
        temp['保荐代表人'] = document.getElementById('sponsor').innerText
        temp['会计师事务所'] = document.getElementById('accounts_org').innerText
        temp['签字会计师'] = document.getElementById('accountant').innerText
        temp['律师事务所'] = document.getElementById('law_firm').innerText
        temp['签字律师'] = document.getElementById('lawyer').innerText
        temp['评估机构'] = document.getElementById('assessor_org').innerText
        temp['签字评估师'] = document.getElementById('assessor').innerText
        return temp
      })
      enList[i] = Object.assign(enList[i], temp)
      await page.waitFor(1000)
    } catch (err) {
      console.log(err.toString())
    }
  }
  console.log(enList)
  console.log('loading done....')
  browser.close()
}

app()
