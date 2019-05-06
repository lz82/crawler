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
                    if (re.exec(item.innerHTML)!=null) {
                        temp[`${tdTitle[index]}:href`] = 'http://kcb.sse.com.cn' + decodeURIComponent(RegExp.$1)
                    }
                }
            })
            tempArr.push(temp)
        })
        return tempArr
    })
    enList.push(...tempArr)

    for(let pageIndex = 1; pageIndex < 100; pageIndex++) {
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
                            if (re.exec(item.innerHTML)!=null) {
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
   
    console.log(enList)
    console.log('loading done....')
    browser.close()
  }

  app()