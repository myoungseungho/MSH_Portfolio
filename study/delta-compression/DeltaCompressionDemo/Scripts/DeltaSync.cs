using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 델타 압축 방식으로 변화량만 전송
/// </summary>
public class DeltaSync : MonoBehaviour
{
    [Header("Sync Settings")]
    public float syncInterval = 0.05f;       // 50ms = 20fps
    public float deltaThreshold = 0.01f;      // 1cm 이상 변화만 전송
    public float fullSyncInterval = 5f;       // 5초마다 전체 동기화
    public bool enableSync = true;

    [Header("Statistics")]
    public int totalPacketsSent = 0;
    public int totalBytesSent = 0;
    public float currentBytesPerSecond = 0f;
    public int skippedPackets = 0;  // 델타가 작아서 건너뛴 패킷 수

    private Dictionary<int, PlayerState> previousStates = new Dictionary<int, PlayerState>();
    private List<Transform> players;
    private float nextSyncTime;
    private float nextFullSyncTime;
    private float bytesSentThisSecond;
    private float lastSecondTime;

    // 패킷 크기 상수
    const int PACKET_HEADER_SIZE = 1;     // packet type
    const int PLAYER_ID_SIZE = 4;         // int
    const int SHORT_SIZE = 2;             // short (압축된 delta)
    const int DELTA_PACKET_SIZE = PACKET_HEADER_SIZE + PLAYER_ID_SIZE + (SHORT_SIZE * 4); // 13 bytes
    const int FULL_PACKET_SIZE = 21;      // Full State와 동일

    void Start()
    {
        lastSecondTime = Time.time;
        nextFullSyncTime = Time.time + fullSyncInterval;
    }

    public void Initialize(List<Transform> playerList)
    {
        players = playerList;

        // 초기 상태 저장
        foreach (Transform player in players)
        {
            if (player != null)
            {
                int id = player.GetInstanceID();
                previousStates[id] = new PlayerState
                {
                    position = player.position,
                    rotation = player.rotation.eulerAngles.y
                };
            }
        }
    }

    void Update()
    {
        if (!enableSync || players == null || players.Count == 0)
            return;

        bool forceFullSync = Time.time >= nextFullSyncTime;

        if (Time.time >= nextSyncTime)
        {
            SyncAllPlayers(forceFullSync);
            nextSyncTime = Time.time + syncInterval;

            if (forceFullSync)
            {
                nextFullSyncTime = Time.time + fullSyncInterval;
            }
        }

        UpdateStatistics();
    }

    void SyncAllPlayers(bool forceFullSync)
    {
        foreach (Transform player in players)
        {
            if (player != null)
            {
                int playerId = player.GetInstanceID();
                Vector3 currentPos = player.position;
                float currentRot = player.rotation.eulerAngles.y;

                if (!previousStates.ContainsKey(playerId))
                {
                    // 신규 플레이어: Full State 전송
                    SendFullState(playerId, currentPos, currentRot);
                    previousStates[playerId] = new PlayerState
                    {
                        position = currentPos,
                        rotation = currentRot
                    };
                    continue;
                }

                PlayerState prevState = previousStates[playerId];

                // 델타 계산
                Vector3 delta = currentPos - prevState.position;
                float deltaRot = Mathf.DeltaAngle(prevState.rotation, currentRot);

                // 유의미한 변화가 있거나 전체 동기화 시점인지 확인
                bool hasSignificantChange =
                    delta.magnitude > deltaThreshold ||
                    Mathf.Abs(deltaRot) > 0.1f;

                if (forceFullSync)
                {
                    // 5초마다 전체 동기화 (오차 보정)
                    SendFullState(playerId, currentPos, currentRot);
                    previousStates[playerId] = new PlayerState
                    {
                        position = currentPos,
                        rotation = currentRot
                    };
                }
                else if (hasSignificantChange)
                {
                    // 델타 전송
                    SendDelta(playerId, delta, deltaRot);
                    previousStates[playerId] = new PlayerState
                    {
                        position = currentPos,
                        rotation = currentRot
                    };
                }
                else
                {
                    // 변화 없음 - 패킷 전송 안 함
                    skippedPackets++;
                }
            }
        }
    }

    void SendDelta(int playerId, Vector3 delta, float deltaRot)
    {
        DeltaPacket packet = new DeltaPacket
        {
            playerId = playerId,
            dx = FloatToShort(delta.x),
            dy = FloatToShort(delta.y),
            dz = FloatToShort(delta.z),
            dRotation = FloatToShort(deltaRot)
        };

        // 통계 업데이트
        totalPacketsSent++;
        totalBytesSent += DELTA_PACKET_SIZE;
        bytesSentThisSecond += DELTA_PACKET_SIZE;
    }

    void SendFullState(int playerId, Vector3 position, float rotation)
    {
        // 전체 동기화 (보정용)
        totalPacketsSent++;
        totalBytesSent += FULL_PACKET_SIZE;
        bytesSentThisSecond += FULL_PACKET_SIZE;
    }

    // float를 short로 압축 (정밀도 0.01, 범위 -327.68 ~ 327.67)
    short FloatToShort(float value)
    {
        return (short)(Mathf.Clamp(value, -327.67f, 327.67f) * 100f);
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
        skippedPackets = 0;
    }

    // 델타 패킷 구조체
    public struct DeltaPacket
    {
        public int playerId;      // 4 bytes
        public short dx;          // 2 bytes
        public short dy;          // 2 bytes
        public short dz;          // 2 bytes
        public short dRotation;   // 2 bytes
        // 총 13 bytes (header 1 byte 포함)
    }

    // 플레이어 상태 저장 구조체
    public struct PlayerState
    {
        public Vector3 position;
        public float rotation;
    }
}
