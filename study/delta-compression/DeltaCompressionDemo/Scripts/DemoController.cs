using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 델타 압축 데모의 메인 컨트롤러
/// 플레이어 생성, 시뮬레이션 시작/정지 관리
/// </summary>
public class DemoController : MonoBehaviour
{
    [Header("Player Settings")]
    public GameObject playerPrefab;
    public int initialPlayerCount = 20;
    public float spawnRadius = 8f;

    [Header("Sync Components")]
    public FullStateSync fullStateSync;
    public DeltaSync deltaSync;

    [Header("UI")]
    public ComparisonUI comparisonUI;

    [Header("Camera")]
    public Camera mainCamera;
    public float cameraHeight = 15f;

    private List<Transform> players = new List<Transform>();
    private bool isRunning = false;

    void Start()
    {
        SetupCamera();
        SpawnPlayers(initialPlayerCount);
        InitializeSyncSystems();
        StartSimulation();
    }

    void SetupCamera()
    {
        if (mainCamera != null)
        {
            mainCamera.transform.position = new Vector3(0f, cameraHeight, 0f);
            mainCamera.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        }
    }

    void SpawnPlayers(int count)
    {
        // 기존 플레이어 제거
        foreach (Transform player in players)
        {
            if (player != null)
                Destroy(player.gameObject);
        }
        players.Clear();

        // 새 플레이어 생성
        for (int i = 0; i < count; i++)
        {
            Vector3 randomPos = Random.insideUnitCircle * spawnRadius;
            Vector3 spawnPos = new Vector3(randomPos.x, 0f, randomPos.y);

            GameObject playerObj = Instantiate(playerPrefab, spawnPos, Quaternion.identity);
            playerObj.name = $"Player_{i}";

            // 색상 랜덤화
            Renderer renderer = playerObj.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.material.color = Random.ColorHSV(0f, 1f, 0.8f, 1f, 0.8f, 1f);
            }

            players.Add(playerObj.transform);
        }

        Debug.Log($"Spawned {count} players");
    }

    void InitializeSyncSystems()
    {
        if (fullStateSync != null)
        {
            fullStateSync.Initialize(players);
        }

        if (deltaSync != null)
        {
            deltaSync.Initialize(players);
        }

        if (comparisonUI != null)
        {
            comparisonUI.SetPlayerCount(players.Count);
        }
    }

    public void StartSimulation()
    {
        isRunning = true;

        if (fullStateSync != null)
            fullStateSync.enableSync = true;

        if (deltaSync != null)
            deltaSync.enableSync = true;

        Debug.Log("Simulation started");
    }

    public void StopSimulation()
    {
        isRunning = false;

        if (fullStateSync != null)
            fullStateSync.enableSync = false;

        if (deltaSync != null)
            deltaSync.enableSync = false;

        Debug.Log("Simulation stopped");
    }

    public void ResetStatistics()
    {
        if (comparisonUI != null)
        {
            comparisonUI.ResetStatistics();
        }

        Debug.Log("Statistics reset");
    }

    public void AddPlayers(int count)
    {
        StopSimulation();
        SpawnPlayers(players.Count + count);
        InitializeSyncSystems();
        StartSimulation();
    }

    public void RemovePlayers(int count)
    {
        StopSimulation();
        int newCount = Mathf.Max(1, players.Count - count);
        SpawnPlayers(newCount);
        InitializeSyncSystems();
        StartSimulation();
    }

    void OnGUI()
    {
        // 간단한 컨트롤 버튼
        GUILayout.BeginArea(new Rect(10, 10, 200, 300));

        GUILayout.Label("Delta Compression Demo", GUI.skin.box);

        if (GUILayout.Button(isRunning ? "Stop" : "Start"))
        {
            if (isRunning)
                StopSimulation();
            else
                StartSimulation();
        }

        if (GUILayout.Button("Reset Statistics"))
        {
            ResetStatistics();
        }

        GUILayout.Space(10);

        if (GUILayout.Button("Add 10 Players"))
        {
            AddPlayers(10);
        }

        if (GUILayout.Button("Remove 10 Players"))
        {
            RemovePlayers(10);
        }

        GUILayout.Space(10);

        GUILayout.Label($"Players: {players.Count}");
        GUILayout.Label($"Status: {(isRunning ? "Running" : "Stopped")}");

        GUILayout.EndArea();
    }
}
