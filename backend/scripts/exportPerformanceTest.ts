import { QueryService } from '../src/services/QueryService';

// 性能测试脚本
async function testExportPerformance() {
  console.log('开始数据导出性能测试...');
  
  const queryService = new QueryService();
  const startTime = Date.now();
  
  try {
    // 执行数据导出
    const jsonData = await queryService.exportScenicAreaData();
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // 转换为秒
    
    // 计算数据大小
    const dataSize = Buffer.byteLength(jsonData, 'utf8') / 1024 / 1024; // 转换为MB
    
    // 解析JSON数据，计算景区数量
    const exportData = JSON.parse(jsonData);
    const scenicAreaCount = exportData.scenicAreas.length;
    const attractionCount = exportData.attractions.length;
    const facilityCount = exportData.facilities.length;
    
    console.log('性能测试结果:');
    console.log(`导出时间: ${executionTime.toFixed(2)} 秒`);
    console.log(`数据大小: ${dataSize.toFixed(2)} MB`);
    console.log(`景区数量: ${scenicAreaCount}`);
    console.log(`景点数量: ${attractionCount}`);
    console.log(`设施数量: ${facilityCount}`);
    
    // 验证导出时间是否在10秒内
    if (executionTime <= 10) {
      console.log('✅ 性能测试通过！导出时间在10秒内');
    } else {
      console.log('❌ 性能测试失败！导出时间超过10秒');
    }
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
testExportPerformance();
