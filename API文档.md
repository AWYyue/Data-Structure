# 智能旅游系统 API 文档

## 1. 认证相关 API

### 1.1 用户注册
- **路径**: `/api/users/register`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "id": "string",
      "username": "string",
      "email": "string"
    }
  }
  ```

### 1.2 用户登录
- **路径**: `/api/users/login`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "string",
      "user": {
        "id": "string",
        "username": "string",
        "email": "string"
      }
    }
  }
  ```

## 2. 推荐系统 API

### 2.1 热度榜
- **路径**: `/api/recommendations/ranking/popularity`
- **方法**: `GET`
- **查询参数**: `limit` (默认: 10)
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "category": "string",
        "rating": number,
        "visitorCount": number
      }
    ]
  }
  ```

### 2.2 评分榜
- **路径**: `/api/recommendations/ranking/rating`
- **方法**: `GET`
- **查询参数**: `limit` (默认: 10)
- **响应**: 同热度榜

### 2.3 评价榜
- **路径**: `/api/recommendations/ranking/review`
- **方法**: `GET`
- **查询参数**: `limit` (默认: 10)
- **响应**: 同热度榜

### 2.4 个人兴趣榜
- **路径**: `/api/recommendations/ranking/personalized`
- **方法**: `GET`
- **查询参数**: `limit` (默认: 10)
- **响应**: 同热度榜

## 3. 路径规划 API

### 3.1 单点路径规划
- **路径**: `/api/path-planning/single-point`
- **方法**: `GET`
- **查询参数**:
  - `startId`: 起点ID
  - `endId`: 终点ID
  - `strategy`: 策略 (distance/time/transport)
  - `transportation`: 交通工具 (walking/biking/electric_car)
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "path": [
        {
          "id": "string",
          "name": "string",
          "x": number,
          "y": number
        }
      ],
      "totalDistance": number,
      "totalTime": number
    }
  }
  ```

### 3.2 多点路径规划
- **路径**: `/api/path-planning/multi-point`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "startId": "string",
    "waypoints": ["string"],
    "strategy": "distance/time",
    "returnToStart": true
  }
  ```
- **响应**: 同单点路径规划

### 3.3 室内导航
- **路径**: `/api/path-planning/indoor`
- **方法**: `GET`
- **查询参数**:
  - `startFloor`: 起点楼层
  - `startX`: 起点X坐标
  - `startY`: 起点Y坐标
  - `endFloor`: 终点楼层
  - `endX`: 终点X坐标
  - `endY`: 终点Y坐标
  - `buildingId`: 建筑物ID
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "path": [
        {
          "floor": number,
          "x": number,
          "y": number
        }
      ],
      "totalDistance": number,
      "totalTime": number
    }
  }
  ```

## 4. 查询系统 API

### 4.1 景区查询
- **路径**: `/api/query/scenic-areas`
- **方法**: `GET`
- **查询参数**:
  - `keyword`: 关键词
  - `category`: 分类
  - `sortBy`: 排序方式 (rating/popularity/reviewCount)
  - `limit`: 限制数量
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "category": "string",
        "rating": number,
        "visitorCount": number
      }
    ]
  }
  ```

### 4.2 景点查询
- **路径**: `/api/query/attractions`
- **方法**: `GET`
- **查询参数**:
  - `scenicAreaId`: 景区ID
  - `keyword`: 关键词
  - `category`: 分类
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "category": "string",
        "rating": number
      }
    ]
  }
  ```

### 4.3 设施查询
- **路径**: `/api/query/facilities`
- **方法**: `GET`
- **查询参数**:
  - `scenicAreaId`: 景区ID
  - `category`: 设施类别
  - `nearbyAttractionId`: 附近景点ID
  - `radius`: 搜索半径
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "location": "string",
        "distance": number
      }
    ]
  }
  ```

## 5. 日记系统 API

### 5.1 创建日记
- **路径**: `/api/diaries`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "title": "string",
    "content": "string",
    "images": ["string"],
    "location": "string",
    "isShared": true
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "Diary created successfully",
    "data": {
      "id": "string",
      "title": "string",
      "content": "string",
      "images": ["string"],
      "location": "string",
      "isShared": true,
      "createdAt": "string"
    }
  }
  ```

### 5.2 获取日记列表
- **路径**: `/api/diaries`
- **方法**: `GET`
- **查询参数**:
  - `userId`: 用户ID (可选，默认获取所有分享的日记)
  - `location`: 地点 (可选)
  - `sortBy`: 排序方式 (popularity/rating/time)
  - `limit`: 限制数量
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "title": "string",
        "content": "string",
        "images": ["string"],
        "location": "string",
        "isShared": true,
        "likes": number,
        "comments": number,
        "createdAt": "string"
      }
    ]
  }
  ```

### 5.3 获取日记详情
- **路径**: `/api/diaries/:id`
- **方法**: `GET`
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "title": "string",
      "content": "string",
      "images": ["string"],
      "location": "string",
      "isShared": true,
      "likes": number,
      "comments": [
        {
          "id": "string",
          "content": "string",
          "userId": "string",
          "username": "string",
          "createdAt": "string"
        }
      ],
      "createdAt": "string"
    }
  }
  ```

### 5.4 点赞日记
- **路径**: `/api/diaries/:id/like`
- **方法**: `POST`
- **响应**:
  ```json
  {
    "success": true,
    "message": "Diary liked successfully",
    "data": {
      "likes": number
    }
  }
  ```

### 5.5 评论日记
- **路径**: `/api/diaries/:id/comment`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "content": "string"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "Comment added successfully",
    "data": {
      "id": "string",
      "content": "string",
      "userId": "string",
      "username": "string",
      "createdAt": "string"
    }
  }
  ```

## 6. 美食系统 API

### 6.1 美食推荐
- **路径**: `/api/food/recommendations`
- **方法**: `GET`
- **查询参数**:
  - `scenicAreaId`: 景区ID
  - `limit`: 限制数量
  - `cuisine`: 菜系
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "cuisine": "string",
        "price": number,
        "description": "string",
        "popularity": number,
        "averageRating": number,
        "facility": {
          "id": "string",
          "name": "string",
          "category": "string"
        }
      }
    ]
  }
  ```

### 6.2 美食搜索
- **路径**: `/api/food/search`
- **方法**: `GET`
- **查询参数**:
  - `keyword`: 关键词
  - `scenicAreaId`: 景区ID
  - `limit`: 限制数量
- **响应**: 同美食推荐

### 6.3 获取所有菜系
- **路径**: `/api/food/cuisines`
- **方法**: `GET`
- **查询参数**:
  - `scenicAreaId`: 景区ID
- **响应**:
  ```json
  {
    "success": true,
    "data": ["string"]
  }
  ```

## 7. 特色功能 API

### 7.1 摄影打卡
- **路径**: `/api/features/photo-checkin`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "attractionId": "string",
    "photoUrl": "string",
    "location": {
      "latitude": number,
      "longitude": number
    },
    "description": "string"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "Photo checkin added successfully",
    "data": {
      "achievement": {
        "id": "string",
        "type": "string",
        "name": "string",
        "description": "string"
      }
    }
  }
  ```

### 7.2 美食推荐（特色功能）
- **路径**: `/api/features/food-recommendations`
- **方法**: `GET`
- **查询参数**: `limit` (默认: 10)
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "cuisine": "string",
        "price": number,
        "description": "string",
        "popularity": number,
        "averageRating": number
      }
    ]
  }
  ```

### 7.3 美食路线规划
- **路径**: `/api/features/food-route`
- **方法**: `GET`
- **查询参数**:
  - `latitude`: 纬度
  - `longitude`: 经度
  - `duration`: 时长（分钟）
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "route": [
        {
          "id": "string",
          "name": "string",
          "cuisine": "string",
          "price": number
        }
      ],
      "totalDistance": number,
      "estimatedTime": number
    }
  }
  ```

### 7.4 个性化提醒
- **路径**: `/api/features/personalized-reminders`
- **方法**: `GET`
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "type": "string",
        "message": "string",
        "priority": "high/medium/low",
        "data": {
          "spots": [
            {
              "id": "string",
              "name": "string",
              "description": "string"
            }
          ]
        }
      }
    ]
  }
  ```

## 8. 健康检查 API

### 8.1 健康检查
- **路径**: `/health`
- **方法**: `GET`
- **响应**:
  ```json
  {
    "status": "ok"
  }
  ```