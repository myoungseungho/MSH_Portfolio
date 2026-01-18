#pragma once
#include <vector>
#include <DirectXMath.h>

using namespace DirectX;

struct BoundingBox {
    XMFLOAT3 center;
    XMFLOAT3 halfSize;

    bool Contains(const XMFLOAT3& point) const {
        return (point.x >= center.x - halfSize.x && point.x <= center.x + halfSize.x &&
                point.y >= center.y - halfSize.y && point.y <= center.y + halfSize.y &&
                point.z >= center.z - halfSize.z && point.z <= center.z + halfSize.z);
    }

    bool Intersects(const BoundingBox& other) const {
        return (fabs(center.x - other.center.x) <= (halfSize.x + other.halfSize.x) &&
                fabs(center.y - other.center.y) <= (halfSize.y + other.halfSize.y) &&
                fabs(center.z - other.center.z) <= (halfSize.z + other.halfSize.z));
    }
};

struct Frustum {
    XMFLOAT4 planes[6]; // Left, Right, Bottom, Top, Near, Far

    void Update(const XMMATRIX& viewProj);
    bool IntersectsBox(const BoundingBox& box) const;
};

struct GameObject {
    XMFLOAT3 position;
    XMFLOAT3 color;
    BoundingBox bounds;

    GameObject(const XMFLOAT3& pos, const XMFLOAT3& col)
        : position(pos), color(col) {
        bounds.center = pos;
        bounds.halfSize = XMFLOAT3(0.5f, 0.5f, 0.5f); // 1x1x1 cube
    }
};

class OctreeNode {
public:
    BoundingBox bounds;
    std::vector<GameObject*> objects;
    OctreeNode* children[8];
    int currentDepth;
    int maxDepth;
    static const int MAX_OBJECTS = 8;

    OctreeNode(const BoundingBox& bounds, int depth, int maxDepth);
    ~OctreeNode();

    void Insert(GameObject* obj);
    void Query(const Frustum& frustum, std::vector<GameObject*>& result, int& nodeChecks);
    void Clear();

private:
    void Subdivide();
    bool IsLeaf() const { return children[0] == nullptr; }
};

class Octree {
public:
    Octree(const BoundingBox& worldBounds, int maxDepth = 6);
    ~Octree();

    void Build(const std::vector<GameObject>& objects);
    void Query(const Frustum& frustum, std::vector<GameObject*>& result, int& nodeChecks);
    void Clear();

    OctreeNode* GetRoot() { return root; }

private:
    OctreeNode* root;
    int maxDepth;
};
