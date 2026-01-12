#include "FresnelApp.h"
#include <Windows.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    // 메모리 누수 체크 (Debug 모드)
#ifdef _DEBUG
    _CrtSetDbgFlag(_CRTDBG_ALLOC_MEM_DF | _CRTDBG_LEAK_CHECK_DF);
#endif

    FresnelApp app;

    if (!app.Initialize(hInstance, 1280, 720, L"Fresnel Effect - Step by Step"))
    {
        MessageBox(nullptr, L"Failed to initialize application", L"Error", MB_OK);
        return -1;
    }

    return app.Run();
}
