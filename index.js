const puppeteer = require('puppeteer')
const Koa = require('koa2')
const router = require('koa-router')()
const Excel = require('exceljs')
const axios = require('axios')
const path = require('path')
const KoaStatic = require('koa-static')

const app = new Koa()

let enList = []
const task = async () => {
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
  const filename = `kcb-${new Date() - 0}.xlsx`
  var workbook = new Excel.stream.xlsx.WorkbookWriter({
    filename: `./data/${filename}`
  });
  var worksheet = workbook.addWorksheet('Sheet');

  worksheet.columns = [
    { header: '序号', key: '序号' },
    { header: '发行人全称', key: '发行人全称' },
    { header: '发行人全称:href', key: '发行人全称:href' },
    { header: '审核状态', key: '审核状态' },
    { header: '注册地', key: '注册地' },
    { header: '证监会行业', key: '证监会行业' },
    { header: '保荐机构', key: '保荐机构' },
    { header: '律师事务所', key: '律师事务所' },
    { header: '会计师事务所', key: '会计师事务所' },
    { header: '更新日期', key: '更新日期' },
    { header: '受理日期', key: '受理日期' },
    { header: '公司全称', key: '公司全称' },
    { header: '公司简称', key: '公司简称' },
    { header: '融资金额(亿元)', key: '融资金额(亿元)' },
    { header: '保荐代表人', key: '保荐代表人' },
    { header: '签字会计师', key: '签字会计师' },
    { header: '签字律师', key: '签字律师' },
    { header: '评估机构', key: '评估机构' },
    { header: '签字评估师', key: '签字评估师' }
  ];

  console.log('开始添加数据');
  // 开始添加数据
  for(let i in enList) {
    worksheet.addRow(enList[i]).commit();
  }
  console.log('添加数据完毕：');

  workbook.commit();

  const instance = axios.create({
    headers: {
      'Content-Type': 'application/json'
    }
  })
  instance.post('https://oapi.dingtalk.com/robot/send?access_token=70852b0831174729bb2bc6b2d00955816b4bc82fda078c41c6a0c0f31551fd60', {
    msgtype: 'text',
    text: {
      "content": `爬虫执行完成，下载链接为：http://localhost:4000/${filename}`
    }
  })
}

router.get('/', async (ctx) => {
  task()
  ctx.body = '爬虫开始执行。。。执行结束后会发送钉钉通知。。。请不要反复刷新！'
})

app.use(router.routes())
app.use(router.allowedMethods())
app.use(KoaStatic(path.join( __dirname, './data')));

app.listen(5566)
