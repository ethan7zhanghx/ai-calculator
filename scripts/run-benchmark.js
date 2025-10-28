#!/usr/bin/env node

/**
 * 模型横向测评运行脚本
 * 使用方法: node scripts/run-benchmark.js [选项]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  dryRun: args.includes('--dry-run'),
  models: [],
  cases: []
};

// 解析 --models 参数
const modelsIndex = args.indexOf('--models');
if (modelsIndex !== -1 && args[modelsIndex + 1]) {
  options.models = args[modelsIndex + 1].split(',');
}

// 解析 --cases 参数
const casesIndex = args.indexOf('--cases');
if (casesIndex !== -1 && args[ccasesIndex + 1]) {
  options.cases = args[casesIndex + 1].split(',');
}

// 显示帮助信息
function showHelp() {
  console.log(`
🧪 AI模型横向测评工具

使用方法:
  node scripts/run-benchmark.js [选项]

选项:
  -h, --help              显示帮助信息
  -v, --verbose           显示详细日志
  --dry-run               仅显示将要执行的测试，不实际运行
  --models <模型列表>      指定要测试的模型，用逗号分隔
                          可选模型: ernie-4.5-turbo-128k,ernie-4.5-21b-a3b,ernie-x1.1,deepseek-v3,kimi-k2-instruct,qwen3-235b-a22b-instruct-2507
  --cases <用例列表>       指定要测试的用例，用逗号分隔
                          可选用例: case1,case2,case3,case4,case5,case6,case7,case8,case9,case10

示例:
  node scripts/run-benchmark.js                           # 运行完整测评
  node scripts/run-benchmark.js --models ernie-4.5-turbo-128k,deepseek-v3  # 只测试两个模型
  node scripts/run-benchmark.js --cases case1,case2       # 只测试前两个用例
  node scripts/run-benchmark.js --dry-run                 # 预览测试计划
  node scripts/run-benchmark.js --verbose                 # 显示详细日志

环境变量:
  QIANFAN_API_KEY          百度千帆API密钥 (必需)

输出:
  - 生成带时间戳的测评报告文件: 模型横向测评报告_YYYY-MM-DD.md
  - 控制台显示实时测试进度
`);
}

// 检查环境变量
function checkEnvironment() {
  if (!process.env.QIANFAN_API_KEY) {
    console.error('❌ 错误: QIANFAN_API_KEY 环境变量未设置');
    console.error('');
    console.error('请设置百度千帆API密钥:');
    console.error('export QIANFAN_API_KEY="your-api-key-here"');
    console.error('');
    console.error('或者在 .env 文件中添加:');
    console.error('QIANFAN_API_KEY=your-api-key-here');
    process.exit(1);
  }
}

// 检查依赖
function checkDependencies() {
  try {
    require('typescript');
  } catch (error) {
    console.error('❌ 错误: 未找到 TypeScript 依赖');
    console.error('');
    console.error('请安装依赖:');
    console.error('npm install');
    console.error('');
    console.error('或者使用 yarn:');
    console.error('yarn install');
    process.exit(1);
  }
}

// 编译TypeScript文件
function compileTypeScript() {
  console.log('🔧 编译 TypeScript...');
  try {
    execSync('npx tsc scripts/model-benchmark.ts --outDir dist --target es2020 --module commonjs --moduleResolution node --esModuleInterop true --allowSyntheticDefaultImports true', {
      stdio: options.verbose ? 'inherit' : 'pipe'
    });
    console.log('✅ TypeScript 编译完成');
  } catch (error) {
    console.error('❌ TypeScript 编译失败');
    if (options.verbose) {
      console.error(error.stdout?.toString());
      console.error(error.stderr?.toString());
    }
    process.exit(1);
  }
}

// 运行测评
function runBenchmark() {
  console.log('🚀 开始模型横向测评');
  console.log('');

  const env = { ...process.env };
  if (options.verbose) {
    env.VERBOSE = 'true';
  }

  try {
    const command = 'node dist/scripts/model-benchmark.js';
    console.log(`执行命令: ${command}`);
    console.log('');

    execSync(command, {
      stdio: 'inherit',
      env
    });

    console.log('');
    console.log('🎉 测评完成!');

  } catch (error) {
    console.error('❌ 测评过程中发生错误');
    process.exit(1);
  }
}

// 主函数
function main() {
  if (options.help) {
    showHelp();
    return;
  }

  console.log('🧪 AI模型横向测评工具');
  console.log('');

  checkEnvironment();
  checkDependencies();

  if (options.dryRun) {
    console.log('🔍 预览模式 - 将要执行的测试:');
    console.log('');
    console.log(`模型数量: ${options.models.length > 0 ? options.models.length : 7} 个`);
    console.log(`用例数量: ${options.cases.length > 0 ? options.cases.length : 10} 个`);
    console.log(`总测试数: ${(options.models.length > 0 ? options.models.length : 7) * (options.cases.length > 0 ? options.cases.length : 10)} 项`);
    console.log('');
    return;
  }

  compileTypeScript();
  runBenchmark();
}

// 运行主函数
main();