#!/bin/bash

# Dify外部知识库API测试脚本

BASE_URL="http://localhost:3000"
API_KEY="test-api-key-123" # 测试用API密钥，生产环境请使用实际密钥

echo "=== Dify外部知识库API测试 ==="

# 测试1: 检索接口（核心功能）
echo -e "\n1. 测试检索接口..."
curl -X POST "$BASE_URL/dify/retrieval" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
    "knowledge_id": "test-kb-001",
    "query": "AI",
    "retrieval_setting": {
      "top_k": 3,
      "score_threshold": 0.3
    }
  }' | jq '.'

echo -e "\n---"

# 测试2: 中文查询
echo -e "\n2. 测试中文查询..."
curl -X POST "$BASE_URL/dify/retrieval" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
    "knowledge_id": "test-kb-001",
    "query": "人工智能模型",
    "retrieval_setting": {
      "top_k": 2,
      "score_threshold": 0.1
    }
  }' | jq '.'

echo -e "\n---"

# 测试3: 元数据过滤（示例）
echo -e "\n3. 测试元数据过滤..."
curl -X POST "$BASE_URL/dify/retrieval" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
    "knowledge_id": "test-kb-001",
    "query": "China",
    "retrieval_setting": {
      "top_k": 5,
      "score_threshold": 0.2
    },
    "metadata_condition": {
      "logical_operator": "and",
      "conditions": [
        {
          "name": ["category"],
          "comparison_operator": "contains",
          "value": "analysis"
        }
      ]
    }
  }' | jq '.'

echo -e "\n---"

# 测试4: 无效API Key
echo -e "\n4. 测试无效API Key..."
curl -X POST "$BASE_URL/dify/retrieval" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid-key" \
    -d '{
    "knowledge_id": "test-kb-001",
    "query": "测试查询",
    "retrieval_setting": {
      "top_k": 3,
      "score_threshold": 0.5
    }
  }' | jq '.'

echo -e "\n---"

# 测试5: 缺少Authorization头
echo -e "\n5. 测试缺少Authorization头..."
curl -X POST "$BASE_URL/dify/retrieval" \
    -H "Content-Type: application/json" \
    -d '{
    "knowledge_id": "test-kb-001",
    "query": "测试查询",
    "retrieval_setting": {
      "top_k": 3,
      "score_threshold": 0.5
    }
  }' | jq '.'

echo -e "\n---"

# 测试6: 测试其他知识库接口
echo -e "\n6. 测试知识库统计接口..."
curl -X GET "$BASE_URL/dify/knowledge-base/stats" | jq '.'

echo -e "\n---"

# 测试7: 测试文档列表接口
echo -e "\n7. 测试文档列表接口..."
curl -X GET "$BASE_URL/dify/knowledge-base/documents?page=1&limit=5" | jq '.'

echo -e "\n---"

# 测试8: 高分数阈值测试
echo -e "\n8. 测试高分数阈值（应返回更少结果）..."
curl -X POST "$BASE_URL/dify/retrieval" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{
    "knowledge_id": "test-kb-001",
    "query": "AI",
    "retrieval_setting": {
      "top_k": 10,
      "score_threshold": 0.9
    }
  }' | jq '.records | length'

echo -e "\n=== 测试完成 ==="

echo -e "\n=== API文档说明 ==="
echo "1. 主要检索端点: POST /dify/retrieval"
echo "2. 认证方式: Bearer Token"
echo "3. 响应格式符合Dify外部知识库API规范"
echo "4. 支持相关性评分和元数据过滤"
echo "5. 详细文档请参考: DIFY_EXTERNAL_API.md"
