using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 전체 상태를 매번 전송하는 방식
/// </summary>
public class FullStateSync : MonoBehaviour
{
    [Header("Sync Settings")]
    public float syncInterval = 0.05f; // 50ms = 20fps
    public bool enableSync = true;

    [Header("Statistics")]
    public int totalPacketsSent = 0;
    public int totalBytesSent = 0;
    public float currentBytesPerSecond = 0f;

    private List<Transform> players;
    private float nextSyncTime;
    private float bytesSentThisSecond;
    private float lastSecondTime;

    // 패킷 크기 상수
    const int PACKET_HEADER_SIZE = 1;     // packet type
    const int PLAYER_ID_SIZE = 4;         // int
    const int FLOAT_SIZE = 4;             // float
    const int FULL_PACKET_SIZE = PACKET_HEADER_SIZE + PLAYER_ID_SIZE + (FLOAT_SIZE * 4); // 21 bytes

    void Start()
    {
        lastSecondTime = Time.time;
    }

    public void Initialize(List<Transform> playerList)
    {
        players = playerList;
    }

    void Update()
    {
        if (!enableSync || players == null || players.Count == 0)
            return;

        if (Time.time >= nextSyncTime)
        {
            SyncAllPlayers();
            nextSyncTime = Time.time + syncInterval;
        }

        UpdateStatistics();
    }

    void SyncAllPlayers()
    {
        foreach (Transform player in players)
        {
            if (player != null)
            {
                SendFullState(player);
            }
        }
    }

    void SendFullState(Transform player)
    {
        // 실제로는 네트워크로 전송하지만, 여기서는 시뮬레이션만
        FullStatePacket packet = new FullStatePacket
        {
            playerId = player.GetInstanceID(),
            x = player.position.x,
            y = player.position.y,
            z = player.position.z,
            rotation = player.rotation.eulerAngles.y
        };

        // 통계 업데이트
        totalPacketsSent++;
        int packetSize = FULL_PACKET_SIZE;
        totalBytesSent += packetSize;
        bytesSentThisSecond += packetSize;

        // 디버그 로그 (선택적)
        // Debug.Log($"[Full State] Player {packet.playerId}: ({packet.x:F2}, {packet.y:F2}, {packet.z:F2})");
    }

    void UpdateStatistics()
    {
        if (Time.time - lastSecondTime >= 1f)
        {
            currentBytesPerSecond = bytesSentThisSecond;
            bytesSentThisSecond = 0f;
            lastSecondTime = Time.time;
        }
    }

    public void ResetStatistics()
    {
        totalPacketsSent = 0;
        totalBytesSent = 0;
        currentBytesPerSecond = 0f;
        bytesSentThisSecond = 0f;
    }

    // 패킷 구조체
    public struct FullStatePacket
    {
        public int playerId;     // 4 bytes
        public float x;          // 4 bytes
        public float y;          // 4 bytes
        public float z;          // 4 bytes
        public float rotation;   // 4 bytes
        // 총 21 bytes (header 1 byte 포함)
    }
}
