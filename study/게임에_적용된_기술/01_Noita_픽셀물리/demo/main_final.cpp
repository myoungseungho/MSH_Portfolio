// Noita Pixel Physics - Working Version
#include <Windows.h>
#include <cstdint>
#include <cstdlib>
#include <ctime>

const int WINDOW_WIDTH = 800;
const int WINDOW_HEIGHT = 600;
const int GRID_WIDTH = 200;
const int GRID_HEIGHT = 150;
const int PIXEL_SIZE = 4;
const int CHUNK_SIZE = 16;
const int CHUNKS_X = (GRID_WIDTH + CHUNK_SIZE - 1) / CHUNK_SIZE;
const int CHUNKS_Y = (GRID_HEIGHT + CHUNK_SIZE - 1) / CHUNK_SIZE;

enum PixelType : uint8_t { EMPTY = 0, SAND = 1, WATER = 2, STONE = 3, FIRE = 4, STEAM = 5 };

struct Pixel {
    PixelType type;
    uint8_t flags;
    uint8_t lifetime;
    enum Flags : uint8_t { UPDATED = 1 };
};

struct Chunk {
    bool active;
    int sleepCounter;
};

Pixel* g_Grid = nullptr;
Chunk* g_Chunks = nullptr;
HWND g_hwnd = nullptr;
PixelType g_currentMaterial = SAND;
bool g_isDrawing = false;

COLORREF GetColor(PixelType type) {
    switch (type) {
        case EMPTY: return RGB(0, 0, 0);
        case SAND:  return RGB(194, 178, 128);
        case WATER: return RGB(74, 144, 226);
        case STONE: return RGB(85, 85, 85);
        case FIRE:  return RGB(255, 69, 0);
        case STEAM: return RGB(170, 170, 170);
        default:    return RGB(0, 0, 0);
    }
}

inline int GetIndex(int x, int y) { return y * GRID_WIDTH + x; }
inline bool InBounds(int x, int y) { return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT; }
inline bool IsEmpty(int x, int y) { return InBounds(x, y) && g_Grid[GetIndex(x, y)].type == EMPTY; }
inline bool IsLiquid(int x, int y) { return InBounds(x, y) && g_Grid[GetIndex(x, y)].type == WATER; }

void ActivateChunk(int x, int y) {
    int cx = x / CHUNK_SIZE;
    int cy = y / CHUNK_SIZE;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int ncx = cx + dx, ncy = cy + dy;
            if (ncx >= 0 && ncx < CHUNKS_X && ncy >= 0 && ncy < CHUNKS_Y) {
                int idx = ncy * CHUNKS_X + ncx;
                g_Chunks[idx].active = true;
                g_Chunks[idx].sleepCounter = 0;
            }
        }
    }
}

void MovePixel(int fromX, int fromY, int toX, int toY) {
    int fromIdx = GetIndex(fromX, fromY);
    int toIdx = GetIndex(toX, toY);
    g_Grid[toIdx] = g_Grid[fromIdx];
    g_Grid[toIdx].flags |= Pixel::UPDATED;
    g_Grid[fromIdx].type = EMPTY;
    g_Grid[fromIdx].flags = 0;
    ActivateChunk(toX, toY);
}

void SwapPixel(int x1, int y1, int x2, int y2) {
    int idx1 = GetIndex(x1, y1);
    int idx2 = GetIndex(x2, y2);
    Pixel temp = g_Grid[idx1];
    g_Grid[idx1] = g_Grid[idx2];
    g_Grid[idx2] = temp;
    g_Grid[idx1].flags |= Pixel::UPDATED;
    g_Grid[idx2].flags |= Pixel::UPDATED;
    ActivateChunk(x1, y1);
    ActivateChunk(x2, y2);
}

void UpdateSand(int x, int y) {
    if (IsEmpty(x, y + 1)) { MovePixel(x, y, x, y + 1); return; }
    if (IsLiquid(x, y + 1)) { SwapPixel(x, y, x, y + 1); return; }
    int dirs[2][2] = {{-1, 1}, {1, 1}};
    if (rand() % 2) { int t[2] = {dirs[0][0], dirs[0][1]}; dirs[0][0] = dirs[1][0]; dirs[0][1] = dirs[1][1]; dirs[1][0] = t[0]; dirs[1][1] = t[1]; }
    for (int i = 0; i < 2; i++) {
        int nx = x + dirs[i][0], ny = y + dirs[i][1];
        if (IsEmpty(nx, ny)) { MovePixel(x, y, nx, ny); return; }
        if (IsLiquid(nx, ny)) { SwapPixel(x, y, nx, ny); return; }
    }
}

void UpdateWater(int x, int y) {
    if (IsEmpty(x, y + 1)) { MovePixel(x, y, x, y + 1); return; }
    int diagDirs[2][2] = {{-1, 1}, {1, 1}};
    if (rand() % 2) { int t[2] = {diagDirs[0][0], diagDirs[0][1]}; diagDirs[0][0] = diagDirs[1][0]; diagDirs[0][1] = diagDirs[1][1]; diagDirs[1][0] = t[0]; diagDirs[1][1] = t[1]; }
    for (int i = 0; i < 2; i++) {
        int nx = x + diagDirs[i][0], ny = y + diagDirs[i][1];
        if (IsEmpty(nx, ny)) { MovePixel(x, y, nx, ny); return; }
    }
    int sideDirs[2][2] = {{-1, 0}, {1, 0}};
    if (rand() % 2) { int t[2] = {sideDirs[0][0], sideDirs[0][1]}; sideDirs[0][0] = sideDirs[1][0]; sideDirs[0][1] = sideDirs[1][1]; sideDirs[1][0] = t[0]; sideDirs[1][1] = t[1]; }
    for (int i = 0; i < 2; i++) {
        int nx = x + sideDirs[i][0], ny = y + sideDirs[i][1];
        if (IsEmpty(nx, ny)) { MovePixel(x, y, nx, ny); return; }
    }
}

void UpdateFire(int x, int y) {
    int idx = GetIndex(x, y);
    if (g_Grid[idx].lifetime > 0) g_Grid[idx].lifetime--;
    else { g_Grid[idx].type = EMPTY; ActivateChunk(x, y); return; }
    int neighbors[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    for (int i = 0; i < 4; i++) {
        int nx = x + neighbors[i][0], ny = y + neighbors[i][1];
        if (!InBounds(nx, ny)) continue;
        int nIdx = GetIndex(nx, ny);
        if (g_Grid[nIdx].type == WATER) {
            g_Grid[nIdx].type = STEAM; g_Grid[nIdx].lifetime = 20;
            g_Grid[idx].type = STEAM; g_Grid[idx].lifetime = 20;
            ActivateChunk(x, y); ActivateChunk(nx, ny);
            return;
        }
    }
    if (rand() % 10 == 0) {
        int n = rand() % 4;
        int nx = x + neighbors[n][0], ny = y + neighbors[n][1];
        if (InBounds(nx, ny)) {
            int nIdx = GetIndex(nx, ny);
            if (g_Grid[nIdx].type == SAND) {
                g_Grid[nIdx].type = FIRE; g_Grid[nIdx].lifetime = 30;
                ActivateChunk(nx, ny);
            }
        }
    }
    if (rand() % 3 == 0 && IsEmpty(x, y - 1)) MovePixel(x, y, x, y - 1);
}

void UpdateSteam(int x, int y) {
    int idx = GetIndex(x, y);
    if (g_Grid[idx].lifetime > 0) g_Grid[idx].lifetime--;
    else { g_Grid[idx].type = EMPTY; ActivateChunk(x, y); return; }
    if (IsEmpty(x, y - 1)) { MovePixel(x, y, x, y - 1); return; }
    int diagDirs[2][2] = {{-1, -1}, {1, -1}};
    if (rand() % 2) { int t[2] = {diagDirs[0][0], diagDirs[0][1]}; diagDirs[0][0] = diagDirs[1][0]; diagDirs[0][1] = diagDirs[1][1]; diagDirs[1][0] = t[0]; diagDirs[1][1] = t[1]; }
    for (int i = 0; i < 2; i++) {
        int nx = x + diagDirs[i][0], ny = y + diagDirs[i][1];
        if (IsEmpty(nx, ny)) { MovePixel(x, y, nx, ny); return; }
    }
    int sideDirs[2][2] = {{-1, 0}, {1, 0}};
    if (rand() % 2) { int t[2] = {sideDirs[0][0], sideDirs[0][1]}; sideDirs[0][0] = sideDirs[1][0]; sideDirs[0][1] = sideDirs[1][1]; sideDirs[1][0] = t[0]; sideDirs[1][1] = t[1]; }
    for (int i = 0; i < 2; i++) {
        int nx = x + sideDirs[i][0], ny = y + sideDirs[i][1];
        if (IsEmpty(nx, ny)) { MovePixel(x, y, nx, ny); return; }
    }
}

void UpdateSimulation() {
    for (int i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) g_Grid[i].flags = 0;

    for (int cy = CHUNKS_Y - 1; cy >= 0; cy--) {
        for (int cx = 0; cx < CHUNKS_X; cx++) {
            int chunkIdx = cy * CHUNKS_X + cx;
            if (!g_Chunks[chunkIdx].active) continue;

            bool hasChanges = false;
            int xStart = cx * CHUNK_SIZE, yStart = cy * CHUNK_SIZE;
            int xEnd = min(xStart + CHUNK_SIZE, GRID_WIDTH);
            int yEnd = min(yStart + CHUNK_SIZE, GRID_HEIGHT);

            for (int y = yEnd - 1; y >= yStart; y--) {
                for (int x = xStart; x < xEnd; x++) {
                    int idx = GetIndex(x, y);
                    if (g_Grid[idx].flags & Pixel::UPDATED) continue;

                    PixelType type = g_Grid[idx].type;
                    PixelType before = type;

                    switch (type) {
                        case SAND:  UpdateSand(x, y);  break;
                        case WATER: UpdateWater(x, y); break;
                        case FIRE:  UpdateFire(x, y);  break;
                        case STEAM: UpdateSteam(x, y); break;
                        default: break;
                    }

                    if (g_Grid[idx].type != before || (g_Grid[idx].flags & Pixel::UPDATED)) {
                        hasChanges = true;
                    }
                }
            }

            if (hasChanges) g_Chunks[chunkIdx].sleepCounter = 0;
            else {
                g_Chunks[chunkIdx].sleepCounter++;
                if (g_Chunks[chunkIdx].sleepCounter > 10) g_Chunks[chunkIdx].active = false;
            }
        }
    }
}

void Render(HDC hdc) {
    for (int gy = 0; gy < GRID_HEIGHT; gy++) {
        for (int gx = 0; gx < GRID_WIDTH; gx++) {
            int idx = GetIndex(gx, gy);
            COLORREF color = GetColor(g_Grid[idx].type);

            HBRUSH brush = CreateSolidBrush(color);
            RECT rect = {
                gx * PIXEL_SIZE,
                gy * PIXEL_SIZE,
                (gx + 1) * PIXEL_SIZE,
                (gy + 1) * PIXEL_SIZE
            };
            FillRect(hdc, &rect, brush);
            DeleteObject(brush);
        }
    }
}

void HandleMouse(int mouseX, int mouseY) {
    int gridX = mouseX / PIXEL_SIZE;
    int gridY = mouseY / PIXEL_SIZE;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int x = gridX + dx, y = gridY + dy;
            if (InBounds(x, y)) {
                int idx = GetIndex(x, y);
                g_Grid[idx].type = g_currentMaterial;
                if (g_currentMaterial == FIRE) g_Grid[idx].lifetime = 30;
                ActivateChunk(x, y);
            }
        }
    }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            Render(hdc);
            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;

        case WM_LBUTTONDOWN:
            g_isDrawing = true;
            HandleMouse(LOWORD(lParam), HIWORD(lParam));
            InvalidateRect(hwnd, NULL, FALSE);
            return 0;

        case WM_LBUTTONUP:
            g_isDrawing = false;
            return 0;

        case WM_MOUSEMOVE:
            if (g_isDrawing) {
                HandleMouse(LOWORD(lParam), HIWORD(lParam));
                InvalidateRect(hwnd, NULL, FALSE);
            }
            return 0;

        case WM_KEYDOWN:
            switch (wParam) {
                case '1': g_currentMaterial = SAND;  break;
                case '2': g_currentMaterial = WATER; break;
                case '3': g_currentMaterial = STONE; break;
                case '4': g_currentMaterial = FIRE;  break;
                case '0': g_currentMaterial = EMPTY; break;
                case VK_ESCAPE: PostQuitMessage(0); break;
            }
            return 0;
    }
    return DefWindowProc(hwnd, msg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int) {
    srand((unsigned)time(NULL));

    g_Grid = new Pixel[GRID_WIDTH * GRID_HEIGHT]();
    g_Chunks = new Chunk[CHUNKS_X * CHUNKS_Y]();

    WNDCLASSEXW wc = {};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    wc.lpszClassName = L"NoitaPixel";
    RegisterClassExW(&wc);

    RECT rc = {0, 0, WINDOW_WIDTH, WINDOW_HEIGHT};
    AdjustWindowRect(&rc, WS_OVERLAPPEDWINDOW, FALSE);

    g_hwnd = CreateWindowExW(0, L"NoitaPixel", L"Noita Pixel Physics - 1:Sand 2:Water 3:Stone 4:Fire 0:Erase ESC:Quit",
        WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME & ~WS_MAXIMIZEBOX,
        100, 100, rc.right - rc.left, rc.bottom - rc.top,
        NULL, NULL, hInstance, NULL);

    if (!g_hwnd) {
        MessageBoxW(NULL, L"Failed to create window!", L"Error", MB_OK);
        return 1;
    }

    ShowWindow(g_hwnd, SW_SHOW);
    UpdateWindow(g_hwnd);

    SetTimer(g_hwnd, 1, 16, NULL); // 60 FPS timer

    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0)) {
        if (msg.message == WM_TIMER && msg.wParam == 1) {
            UpdateSimulation();
            InvalidateRect(g_hwnd, NULL, FALSE);
        }
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    delete[] g_Grid;
    delete[] g_Chunks;
    return (int)msg.wParam;
}
