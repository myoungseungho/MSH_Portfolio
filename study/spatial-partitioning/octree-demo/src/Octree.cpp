#include "Octree.h"
#include <algorithm>

// Frustum Implementation
void Frustum::Update(const XMMATRIX& viewProj) {
    XMFLOAT4X4 vp;
    XMStoreFloat4x4(&vp, viewProj);

    // Left plane
    planes[0].x = vp._14 + vp._11;
    planes[0].y = vp._24 + vp._21;
    planes[0].z = vp._34 + vp._31;
    planes[0].w = vp._44 + vp._41;

    // Right plane
    planes[1].x = vp._14 - vp._11;
    planes[1].y = vp._24 - vp._21;
    planes[1].z = vp._34 - vp._31;
    planes[1].w = vp._44 - vp._41;

    // Bottom plane
    planes[2].x = vp._14 + vp._12;
    planes[2].y = vp._24 + vp._22;
    planes[2].z = vp._34 + vp._32;
    planes[2].w = vp._44 + vp._42;

    // Top plane
    planes[3].x = vp._14 - vp._12;
    planes[3].y = vp._24 - vp._22;
    planes[3].z = vp._34 - vp._32;
    planes[3].w = vp._44 - vp._42;

    // Near plane
    planes[4].x = vp._13;
    planes[4].y = vp._23;
    planes[4].z = vp._33;
    planes[4].w = vp._43;

    // Far plane
    planes[5].x = vp._14 - vp._13;
    planes[5].y = vp._24 - vp._23;
    planes[5].z = vp._34 - vp._33;
    planes[5].w = vp._44 - vp._43;

    // Normalize planes
    for (int i = 0; i < 6; i++) {
        XMVECTOR plane = XMLoadFloat4(&planes[i]);
        plane = XMPlaneNormalize(plane);
        XMStoreFloat4(&planes[i], plane);
    }
}

bool Frustum::IntersectsBox(const BoundingBox& box) const {
    for (int i = 0; i < 6; i++) {
        XMVECTOR plane = XMLoadFloat4(&planes[i]);
        XMFLOAT3 positiveVertex = box.center;

        if (planes[i].x >= 0) positiveVertex.x += box.halfSize.x; else positiveVertex.x -= box.halfSize.x;
        if (planes[i].y >= 0) positiveVertex.y += box.halfSize.y; else positiveVertex.y -= box.halfSize.y;
        if (planes[i].z >= 0) positiveVertex.z += box.halfSize.z; else positiveVertex.z -= box.halfSize.z;

        XMVECTOR vertex = XMLoadFloat3(&positiveVertex);
        if (XMVectorGetX(XMPlaneDotCoord(plane, vertex)) < 0) {
            return false; // Outside this plane
        }
    }
    return true;
}

// OctreeNode Implementation
OctreeNode::OctreeNode(const BoundingBox& bounds, int depth, int maxDepth)
    : bounds(bounds), currentDepth(depth), maxDepth(maxDepth) {
    for (int i = 0; i < 8; i++) {
        children[i] = nullptr;
    }
}

OctreeNode::~OctreeNode() {
    Clear();
}

void OctreeNode::Insert(GameObject* obj) {
    if (!bounds.Contains(obj->position)) {
        return; // Not in this node
    }

    // If has children, delegate to children
    if (!IsLeaf()) {
        for (int i = 0; i < 8; i++) {
            children[i]->Insert(obj);
        }
        return;
    }

    // Add to this node
    objects.push_back(obj);

    // Check if we need to subdivide
    if (objects.size() > MAX_OBJECTS && currentDepth < maxDepth) {
        Subdivide();
    }
}

void OctreeNode::Query(const Frustum& frustum, std::vector<GameObject*>& result, int& nodeChecks) {
    nodeChecks++;

    // Check if frustum intersects this node
    if (!frustum.IntersectsBox(bounds)) {
        return;
    }

    // If leaf, add all objects
    if (IsLeaf()) {
        for (auto obj : objects) {
            if (frustum.IntersectsBox(obj->bounds)) {
                result.push_back(obj);
            }
        }
        return;
    }

    // Recurse to children
    for (int i = 0; i < 8; i++) {
        children[i]->Query(frustum, result, nodeChecks);
    }
}

void OctreeNode::Subdivide() {
    float halfX = bounds.halfSize.x / 2.0f;
    float halfY = bounds.halfSize.y / 2.0f;
    float halfZ = bounds.halfSize.z / 2.0f;

    XMFLOAT3 newHalfSize(halfX, halfY, halfZ);

    // Create 8 children
    for (int i = 0; i < 8; i++) {
        XMFLOAT3 offset;
        offset.x = (i & 1) ? halfX : -halfX;
        offset.y = (i & 2) ? halfY : -halfY;
        offset.z = (i & 4) ? halfZ : -halfZ;

        BoundingBox childBounds;
        childBounds.center = XMFLOAT3(
            bounds.center.x + offset.x,
            bounds.center.y + offset.y,
            bounds.center.z + offset.z
        );
        childBounds.halfSize = newHalfSize;

        children[i] = new OctreeNode(childBounds, currentDepth + 1, maxDepth);
    }

    // Redistribute objects to children
    for (auto obj : objects) {
        for (int i = 0; i < 8; i++) {
            children[i]->Insert(obj);
        }
    }

    // Clear this node's objects
    objects.clear();
}

void OctreeNode::Clear() {
    for (int i = 0; i < 8; i++) {
        if (children[i]) {
            delete children[i];
            children[i] = nullptr;
        }
    }
    objects.clear();
}

// Octree Implementation
Octree::Octree(const BoundingBox& worldBounds, int maxDepth)
    : maxDepth(maxDepth) {
    root = new OctreeNode(worldBounds, 0, maxDepth);
}

Octree::~Octree() {
    delete root;
}

void Octree::Build(const std::vector<GameObject>& objects) {
    Clear();
    for (size_t i = 0; i < objects.size(); i++) {
        root->Insert(const_cast<GameObject*>(&objects[i]));
    }
}

void Octree::Query(const Frustum& frustum, std::vector<GameObject*>& result, int& nodeChecks) {
    nodeChecks = 0;
    root->Query(frustum, result, nodeChecks);
}

void Octree::Clear() {
    root->Clear();
}
