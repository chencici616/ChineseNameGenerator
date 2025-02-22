/**
 * 中文名字生成器服务器端应用
 * 提供Web服务器功能和AI接口集成
 * 使用火山引擎API进行中文名字生成
 */

// 导入所需的Node.js核心模块
const https = require('https');  // 用于发送HTTPS请求到火山引擎API
const fs = require('fs');      // 用于读取静态文件
const path = require('path');  // 用于安全地处理文件路径
const http = require('http');  // 用于创建本地HTTP服务器

// 服务器配置
const PORT = 3000;  // 本地服务器监听端口
const API_KEY = process.env.API_KEY || 'e4818a78-97e6-48a8-954c-f47f786b142a';  // 优先使用环境变量中的API密钥
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';  // 火山引擎AI服务接口地址

/**
 * 创建HTTP服务器实例
 * 处理静态文件服务和API请求
 * 实现跨域资源共享(CORS)支持
 */
const server = http.createServer(async (req, res) => {
    // 配置CORS和响应头
    // 1. 允许跨域访问，支持本地开发
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 2. 允许的HTTP请求方法
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    // 3. 允许的请求头字段
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // 4. 设置默认响应类型为JSON
    res.setHeader('Content-Type', 'application/json');

    // 处理CORS预检请求
    // OPTIONS请求用于检查实际请求是否可以发送
    if (req.method === 'OPTIONS') {
        res.writeHead(204);  // 返回204状态码（无内容）表示允许跨域请求
        res.end();
        return;
    }

    const url = req.url;  // 获取请求URL

    // 处理GET请求（用于提供静态文件）
    if (req.method === 'GET') {
        let filePath = '';  // 文件路径
        // 如果访问根路径，返回index.html
        if (url === '/') {
            filePath = path.join(__dirname, 'index.html');
        } else {
            // 否则返回请求的文件
            filePath = path.join(__dirname, url);
        }

        try {
            // 读取文件内容
            const content = fs.readFileSync(filePath);
            // 获取文件扩展名
            const ext = path.extname(filePath);
            // 根据文件扩展名设置正确的Content-Type
            const contentType = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css'
            }[ext] || 'text/plain';

            // 发送文件内容
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } catch (error) {
            // 文件不存在时返回404错误
            res.writeHead(404);
            res.end('File not found');
        }
    } 
    // 处理名字生成API请求
    // 接收POST请求，调用AI服务生成中文名字
    else if (req.method === 'POST' && url === '/generate-names') {
        let body = '';  // 存储POST请求体数据
        // 分块接收请求数据
        req.on('data', chunk => {
            body += chunk.toString();  // 将二进制数据转换为字符串
        });

        // 请求数据接收完成后的处理
        req.on('end', async () => {
            try {
                // 解析请求体中的英文名
                const { englishName, gender, requirements } = JSON.parse(body);
                
                // 构建AI提示词
                // 详细指导AI如何生成有文化内涵的中文名字
                const prompt = `作为一个专业的中文名字起名专家，请为英文名"${englishName}"生成3个富有文化内涵的中文名。

基本信息：
1. 性别：${gender === 'male' ? '男' : '女'}
2. 特殊要求：${requirements || '无特殊要求'}

要求：
1. 理解英文名的含义和特点
2. 根据指定性别生成合适的名字
3. 充分考虑用户的特殊要求
4. 每个中文名都要遵循中国传统取名习惯：
   - 姓氏一个字
   - 名字一到两个字
   - 避免生僻字
   - 名字要读音优美
5. 每个名字要体现中国传统文化特色
6. 为每个名字提供详细的中英文解释

请按以下格式返回：
{
  "names": [
    {
      "chinese": "中文名1",
      "meaning": {
        "chinese": "中文解释1",
        "english": "English explanation 1"
      }
    },
    {
      "chinese": "中文名2",
      "meaning": {
        "chinese": "中文解释2",
        "english": "English explanation 2"
      }
    },
    {
      "chinese": "中文名3",
      "meaning": {
        "chinese": "中文解释3",
        "english": "English explanation 3"
      }
    }
  ]
}`;

                // 调用火山引擎AI服务
                // 使用Promise封装异步请求，支持超时处理
                const apiResponse = await new Promise((resolve, reject) => {
                    // 创建HTTPS请求配置
                    const apiReq = https.request(
                        API_URL,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${API_KEY}`  // 身份验证
                            }
                        },
                        apiRes => {
                            let data = '';
                            // 接收API响应数据
                            apiRes.on('data', chunk => data += chunk);
                            apiRes.on('end', () => resolve(data));
                        }
                    );

                    // 处理请求错误
                    apiReq.on('error', reject);
                    // 设置请求超时（60秒）
                    apiReq.setTimeout(60000, () => {
                        apiReq.destroy();
                        reject(new Error('Request timeout'));
                    });

                    // 发送API请求数据
                    apiReq.write(JSON.stringify({
                        model: 'deepseek-r1-250120',  // 使用的AI模型
                        messages: [
                            {role: 'system', content: '你是一个专业的中文名字起名专家，精通中英文文化。'},
                            {role: 'user', content: prompt}
                        ]
                    }));
                    apiReq.end();
                });

                // 将API响应发送给客户端
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(apiResponse);
            } catch (error) {
                // 处理错误情况
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else {
        // 处理未知的请求路径
        res.writeHead(404);
        res.end('Not found');
    }
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});