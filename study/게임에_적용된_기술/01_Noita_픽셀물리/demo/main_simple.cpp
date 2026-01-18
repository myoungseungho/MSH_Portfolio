// Noita 스타일 픽셀 물리 시뮬레이션 (Win32 GDI 버전)
// 빌드: g++ main_simple.cpp -o NoitaPixel.exe -lgdi32 -luser32
// 또는 Visual Studio에서 Win32 Console Application으로 빌드

#include <Windows.h>
#include <cstdint>
#include <cstdlib>
#include <ctime>

// ============================================
// 설정
// ============================================
const int WINDOW_WIDTH = 800;
const int WINDOW_HEIGHT = 600;
const int GRID_WIDTH = 200;
const int GRID_HEIGHT = 150;
const int PIXEL_SIZE = 4;

const int CHUNK_SIZE = 16;
const int CHUNKS_X = (GRID_WIDTH + CHUNK_SIZE - 1) / CHUNK_SIZE;
const int CHUNKS_Y = (GRID_HEIGHT + CHUNK_SIZE - 1) / CHUNK_SIZE;

// ============================================
// 물질 타입
// ============================================
enum PixelType : uint8_t {
    EMPTY = 0,
    SAND = 1,
    WATER = 2,
    STONE = 3,
    FIRE = 4,
    STEAM = 5
};

struct Pixel {
    PixelType type;
    uint8_t flags;
    int8_t vx, vy;
    uint8_t lifetime;

    enum Flags : uint8_t {
        UPDATED = 1 << 0,
        MOVED = 1 << 1
    };
};

struct Chunk {
    bool active;
    int sleepCounter;
};

// ============================================
// 전역 변수
// ============================================
Pixel* g_Grid = nullptr;
Chunk* g_Chunks = nullptr;
uint32_t* g_ColorBuffer = nullptr;

HWND g_hwnd = nullptr;
HDC g_hdcMem = nullptr;
HBITMAP g_hBitmap = nullptr;
uint32_t* g_BitmapBits = nullptr;

PixelType g_currentMaterial = SAND;
bool g_isDrawing = false;

// ============================================
// 색상 팔레트 (BGRA 형식)
// ============================================
uint32_t GetColor(PixelType type) {
    switch (type) {
        case EMPTY: return 0xFF000000;
        case SAND:  return 0xFF80B2C2; // BGR
        case WATER: return 0xFFE2904A;
        case STONE: return 0xFF555555;
        case FIRE:  return 0xFF0045FF;
        case STEAM: return 0xFFAAAAAA;
        default:    return 0xFF000000;
    }
}

// ============================================
// 그리드 함수
// ============================================
inline int GetIndex(int x, int y) {
    return y * GRID_WIDTH + x;
}

inline bool InBounds(int x, int y) {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}

inline bool IsEmpty(int x, int y) {
    if (!InBounds(x, y)) return false;
    return g_Grid[GetIndex(x, y)].type == EMPTY;
}

inline bool IsLiquid(int x, int y) {
    if (!InBounds(x, y)) return false;
    return g_Grid[GetIndex(x, y)].type == WATER;
}

void ActivateChunk(int x, int y) {
    int cx = x / CHUNK_SIZE;
    int cy = y / CHUNK_SIZE;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int ncx = cx + dx;
            int ncy = cy + dy;
            if (ncx >= 0 && ncx < CHUNKS_X && ncy >= 0 && ncy < CHUNKS_Y) {
                int chunkIdx = ncy * CHUNKS_X + ncx;
                g_Chunks[chunkIdx].active = true;
                g_Chunks[chunkIdx].sleepCounter = 0;
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
    g_Grid[fromIdx].lifetime = 0;

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

// ============================================
// 물질별 업데이트
// ============================================
void UpdateSand(int x, int y) {
    if (IsEmpty(x, y + 1)) {
        MovePixel(x, y, x, y + 1);
        return;
    }

    if (IsLiquid(x, y + 1)) {
        SwapPixel(x, y, x, y + 1);
        return;
    }

    int dirs[2][2] = {{-1, 1}, {1, 1}};
    if (rand() % 2) {
        int temp[2] = {dirs[0][0], dirs[0][1]};
        dirs[0][0] = dirs[1][0];
        dirs[0][1] = dirs[1][1];
        dirs[1][0] = temp[0];
        dirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + dirs[i][0];
        int ny = y + dirs[i][1];

        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }

        if (IsLiquid(nx, ny)) {
            SwapPixel(x, y, nx, ny);
            return;
        }
    }
}

void UpdateWater(int x, int y) {
    if (IsEmpty(x, y + 1)) {
        MovePixel(x, y, x, y + 1);
        return;
    }

    int diagDirs[2][2] = {{-1, 1}, {1, 1}};
    if (rand() % 2) {
        int temp[2] = {diagDirs[0][0], diagDirs[0][1]};
        diagDirs[0][0] = diagDirs[1][0];
        diagDirs[0][1] = diagDirs[1][1];
        diagDirs[1][0] = temp[0];
        diagDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + diagDirs[i][0];
        int ny = y + diagDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }

    int sideDirs[2][2] = {{-1, 0}, {1, 0}};
    if (rand() % 2) {
        int temp[2] = {sideDirs[0][0], sideDirs[0][1]};
        sideDirs[0][0] = sideDirs[1][0];
        sideDirs[0][1] = sideDirs[1][1];
        sideDirs[1][0] = temp[0];
        sideDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + sideDirs[i][0];
        int ny = y + sideDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }
}

void UpdateFire(int x, int y) {
    int idx = GetIndex(x, y);

    if (g_Grid[idx].lifetime > 0) {
        g_Grid[idx].lifetime--;
    } else {
        g_Grid[idx].type = EMPTY;
        ActivateChunk(x, y);
        return;
    }

    int neighbors[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    for (int i = 0; i < 4; i++) {
        int nx = x + neighbors[i][0];
        int ny = y + neighbors[i][1];

        if (!InBounds(nx, ny)) continue;

        int nIdx = GetIndex(nx, ny);
        if (g_Grid[nIdx].type == WATER) {
            g_Grid[nIdx].type = STEAM;
            g_Grid[nIdx].lifetime = 20;
            g_Grid[idx].type = STEAM;
            g_Grid[idx].lifetime = 20;
            ActivateChunk(x, y);
            ActivateChunk(nx, ny);
            return;
        }
    }

    if (rand() % 10 == 0) {
        int n = rand() % 4;
        int nx = x + neighbors[n][0];
        int ny = y + neighbors[n][1];

        if (InBounds(nx, ny)) {
            int nIdx = GetIndex(nx, ny);
            if (g_Grid[nIdx].type == SAND) {
                g_Grid[nIdx].type = FIRE;
                g_Grid[nIdx].lifetime = 30;
                ActivateChunk(nx, ny);
            }
        }
    }

    if (rand() % 3 == 0 && IsEmpty(x, y - 1)) {
        MovePixel(x, y, x, y - 1);
    }
}

void UpdateSteam(int x, int y) {
    int idx = GetIndex(x, y);

    if (g_Grid[idx].lifetime > 0) {
        g_Grid[idx].lifetime--;
    } else {
        g_Grid[idx].type = EMPTY;
        ActivateChunk(x, y);
        return;
    }

    if (IsEmpty(x, y - 1)) {
        MovePixel(x, y, x, y - 1);
        return;
    }

    int diagDirs[2][2] = {{-1, -1}, {1, -1}};
    if (rand() % 2) {
        int temp[2] = {diagDirs[0][0], diagDirs[0][1]};
        diagDirs[0][0] = diagDirs[1][0];
        diagDirs[0][1] = diagDirs[1][1];
        diagDirs[1][0] = temp[0];
        diagDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + diagDirs[i][0];
        int ny = y + diagDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }

    int sideDirs[2][2] = {{-1, 0}, {1, 0}};
    if (rand() % 2) {
        int temp[2] = {sideDirs[0][0], sideDirs[0][1]};
        sideDirs[0][0] = sideDirs[1][0];
        sideDirs[0][1] = sideDirs[1][1];
        sideDirs[1][0] = temp[0];
        sideDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + sideDirs[i][0];
        int ny = y + sideDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }
}

// ============================================
// 메인 업데이트 루프
// ============================================
void UpdateSimulation() {
    for (int i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
        g_Grid[i].flags = 0;
    }

    for (int cy = CHUNKS_Y - 1; cy >= 0; cy--) {
        for (int cx = 0; cx < CHUNKS_X; cx++) {
            int chunkIdx = cy * CHUNKS_X + cx;

            if (!g_Chunks[chunkIdx].active) continue;

            bool hasChanges = false;

            int xStart = cx * CHUNK_SIZE;
            int yStart = cy * CHUNK_SIZE;
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

            if (hasChanges) {
                g_Chunks[chunkIdx].sleepCounter = 0;
            } else {
                g_Chunks[chunkIdx].sleepCounter++;
                if (g_Chunks[chunkIdx].sleepCounter > 10) {
                    g_Chunks[chunkIdx].active = false;
                }
            }
        }
    }
}

// ============================================
// 렌더링
// ============================================
void Render() {
    // 그리드 → 비트맵 (확대)
    for (int gy = 0; gy < GRID_HEIGHT; gy++) {
        for (int gx = 0; gx < GRID_WIDTH; gx++) {
            int idx = GetIndex(gx, gy);
            uint32_t color = GetColor(g_Grid[idx].type);

            // PIXEL_SIZE × PIXEL_SIZE로 확대
            for (int py = 0; py < PIXEL_SIZE; py++) {
                for (int px = 0; px < PIXEL_SIZE; px++) {
                    int screenX = gx * PIXEL_SIZE + px;
                    int screenY = gy * PIXEL_SIZE + py;
                    g_BitmapBits[screenY * WINDOW_WIDTH + screenX] = color;
                }
            }
        }
    }

    // 화면에 복사
    HDC hdc = GetDC(g_hwnd);
    BitBlt(hdc, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT, g_hdcMem, 0, 0, SRCCOPY);
    ReleaseDC(g_hwnd, hdc);
}

// ============================================
// 마우스 입력
// ============================================
void HandleMouse(int mouseX, int mouseY) {
    int gridX = mouseX / PIXEL_SIZE;
    int gridY = mouseY / PIXEL_SIZE;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int x = gridX + dx;
            int y = gridY + dy;

            if (InBounds(x, y)) {
                int idx = GetIndex(x, y);
                g_Grid[idx].type = g_currentMaterial;

                if (g_currentMaterial == FIRE) {
                    g_Grid[idx].lifetime = 30;
                }

                ActivateChunk(x, y);
            }
        }
    }
}

// ============================================
// GDI 초기화
// ============================================
bool InitGDI(HWND hwnd) {
    HDC hdc = GetDC(hwnd);
    g_hdcMem = CreateCompatibleDC(hdc);

    BITMAPINFO bmi = {};
    bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bmi.bmiHeader.biWidth = WINDOW_WIDTH;
    bmi.bmiHeader.biHeight = -WINDOW_HEIGHT; // Top-down
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;

    g_hBitmap = CreateDIBSection(g_hdcMem, &bmi, DIB_RGB_COLORS, (void**)&g_BitmapBits, nullptr, 0);
    if (!g_hBitmap) {
        ReleaseDC(hwnd, hdc);
        return false;
    }

    SelectObject(g_hdcMem, g_hBitmap);
    ReleaseDC(hwnd, hdc);

    return true;
}

void CleanupGDI() {
    if (g_hBitmap) DeleteObject(g_hBitmap);
    if (g_hdcMem) DeleteDC(g_hdcMem);
}

// ============================================
// 윈도우 프로시저
// ============================================
LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            BitBlt(hdc, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT, g_hdcMem, 0, 0, SRCCOPY);
            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;

        case WM_LBUTTONDOWN:
            g_isDrawing = true;
            HandleMouse(LOWORD(lParam), HIWORD(lParam));
            return 0;

        case WM_LBUTTONUP:
            g_isDrawing = false;
            return 0;

        case WM_MOUSEMOVE:
            if (g_isDrawing) {
                HandleMouse(LOWORD(lParam), HIWORD(lParam));
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

// ============================================
// 진입점
// ============================================
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int) {
    srand((unsigned)time(nullptr));

    g_Grid = new Pixel[GRID_WIDTH * GRID_HEIGHT]();
    g_Chunks = new Chunk[CHUNKS_X * CHUNKS_Y]();

    WNDCLASSEX wc = {};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    wc.lpszClassName = L"NoitaPixelPhysics";
    RegisterClassEx(&wc);

    RECT rc = {0, 0, WINDOW_WIDTH, WINDOW_HEIGHT};
    AdjustWindowRect(&rc, WS_OVERLAPPEDWINDOW, FALSE);

    g_hwnd = CreateWindowEx(
        0, L"NoitaPixelPhysics", L"Noita 픽셀 물리 - 1:모래 2:물 3:돌 4:불 0:지우개 ESC:종료",
        WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME & ~WS_MAXIMIZEBOX,
        CW_USEDEFAULT, CW_USEDEFAULT,
        rc.right - rc.left, rc.bottom - rc.top,
        nullptr, nullptr, hInstance, nullptr
    );

    if (!g_hwnd || !InitGDI(g_hwnd)) {
        MessageBox(nullptr, L"초기화 실패", L"Error", MB_OK);
        return 1;
    }

    // 초기 화면을 빨간색으로 채워서 렌더링 테스트
    for (int i = 0; i < WINDOW_WIDTH * WINDOW_HEIGHT; i++) {
        g_BitmapBits[i] = 0xFF0000FF; // 빨간색 (BGRA)
    }

    ShowWindow(g_hwnd, SW_SHOW);
    UpdateWindow(g_hwnd);

    // 초기 렌더링
    HDC hdc = GetDC(g_hwnd);
    BitBlt(hdc, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT, g_hdcMem, 0, 0, SRCCOPY);
    ReleaseDC(g_hwnd, hdc);

    MSG msg = {};
    LARGE_INTEGER freq, lastTime, currentTime;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&lastTime);

    while (msg.message != WM_QUIT) {
        if (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        } else {
            QueryPerformanceCounter(&currentTime);
            double deltaTime = (double)(currentTime.QuadPart - lastTime.QuadPart) / freq.QuadPart;

            if (deltaTime >= 0.016) { // ~60 FPS
                UpdateSimulation();
                Render();
                lastTime = currentTime;
            }
        }
    }

    CleanupGDI();
    delete[] g_Grid;
    delete[] g_Chunks;

    return (int)msg.wParam;
}
