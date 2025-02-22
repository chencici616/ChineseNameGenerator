/**
 * 生成中文名字的主函数
 * 该函数负责处理用户输入，发送API请求，并在页面上展示生成的中文名字
 * 包含错误处理和加载状态管理
 */
async function generateNames() {
    // 获取并处理用户输入信息
    // 1. 获取用户输入的英文名并去除首尾空格
    const englishName = document.getElementById('englishName').value.trim();
    // 2. 获取用户选择的性别（单选按钮组）
    const gender = document.querySelector('input[name="gender"]:checked').value;
    // 3. 获取用户输入的个性化要求（可选）
    const requirements = document.getElementById('requirements').value.trim();
    
    // 输入验证：确保用户输入了英文名
    if (!englishName) {
        alert('请输入您的英文名！');
        return;
    }

    // 获取页面上的UI元素
    // 1. 加载动画元素
    const loading = document.getElementById('loading');
    // 2. 结果显示区域
    const results = document.getElementById('results');

    // 更新UI状态：显示加载动画，清空并隐藏结果区域
    loading.style.display = 'block';
    results.style.display = 'none';
    results.innerHTML = '';

    try {
        // 发送POST请求到后端服务器
        // 1. 构建请求配置，包含用户输入的所有信息
        const response = await fetch('http://localhost:3000/generate-names', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // 将用户输入数据序列化为JSON格式
            body: JSON.stringify({ englishName, gender, requirements })
        });

        // 检查请求是否成功，如果失败则抛出错误
        if (!response.ok) {
            throw new Error('网络请求失败');
        }

        // 处理服务器返回的数据
        // 1. 解析JSON响应
        const data = await response.json();
        // 2. 获取AI生成的名字内容
        const names = data.choices[0].message.content;
        // 3. 将字符串解析为JSON对象
        const namesObj = JSON.parse(names);

        // 在页面上展示生成的名字
        // 1. 遍历每个生成的名字
        namesObj.names.forEach(name => {
            // 2. 创建名字展示卡片
            const nameCard = document.createElement('div');
            nameCard.className = 'name-card';
            // 3. 设置卡片内容，包含中文名和双语解释
            nameCard.innerHTML = `
                <div class="chinese-name">${name.chinese}</div>
                <div class="meaning">
                    <p>中文寓意：${name.meaning.chinese}</p>
                    <p>English Meaning: ${name.meaning.english}</p>
                </div>
            `;
            // 4. 将卡片添加到结果区域
            results.appendChild(nameCard);
        });

        // 显示结果区域
        results.style.display = 'block';
    } catch (error) {
        // 错误处理：显示错误信息
        alert('生成名字时出错：' + error.message);
    } finally {
        // 无论成功与否，都隐藏加载动画
        loading.style.display = 'none';
    }
}