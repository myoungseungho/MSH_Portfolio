using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Full State와 Delta 압축 방식의 트래픽을 비교하는 UI
/// </summary>
public class ComparisonUI : MonoBehaviour
{
    [Header("UI References")]
    public Text fullStatePacketsText;
    public Text fullStateBytesText;
    public Text fullStateBytesPerSecText;

    public Text deltaPacketsText;
    public Text deltaBytesText;
    public Text deltaBytesPerSecText;
    public Text deltaSkippedText;

    public Text comparisonText;
    public Text playerCountText;

    [Header("Sync References")]
    public FullStateSync fullStateSync;
    public DeltaSync deltaSync;

    [Header("Colors")]
    public Color fullStateColor = new Color(1f, 0.5f, 0.5f);  // 빨강
    public Color deltaColor = new Color(0.5f, 1f, 0.5f);      // 초록

    private int playerCount = 0;

    void Update()
    {
        UpdateUI();
    }

    public void SetPlayerCount(int count)
    {
        playerCount = count;
    }

    void UpdateUI()
    {
        if (fullStateSync != null)
        {
            // Full State 통계
            fullStatePacketsText.text = $"Packets: {fullStateSync.totalPacketsSent:N0}";
            fullStateBytesText.text = $"Total: {FormatBytes(fullStateSync.totalBytesSent)}";
            fullStateBytesPerSecText.text = $"Rate: {FormatBytesPerSecond(fullStateSync.currentBytesPerSecond)}";
        }

        if (deltaSync != null)
        {
            // Delta 통계
            deltaPacketsText.text = $"Packets: {deltaSync.totalPacketsSent:N0}";
            deltaBytesText.text = $"Total: {FormatBytes(deltaSync.totalBytesSent)}";
            deltaBytesPerSecText.text = $"Rate: {FormatBytesPerSecond(deltaSync.currentBytesPerSecond)}";
            deltaSkippedText.text = $"Skipped: {deltaSync.skippedPackets:N0}";
        }

        // 비교 (절약률 계산)
        if (fullStateSync != null && deltaSync != null && fullStateSync.totalBytesSent > 0)
        {
            float savedBytes = fullStateSync.totalBytesSent - deltaSync.totalBytesSent;
            float savingPercentage = (savedBytes / fullStateSync.totalBytesSent) * 100f;
            float compressionRatio = fullStateSync.totalBytesSent / (float)Mathf.Max(1, deltaSync.totalBytesSent);

            comparisonText.text = $@"Saved: {FormatBytes((int)savedBytes)} ({savingPercentage:F1}%)
Compression Ratio: {compressionRatio:F2}x";
        }

        // 플레이어 수
        if (playerCountText != null)
        {
            playerCountText.text = $"Players: {playerCount}";
        }
    }

    string FormatBytes(int bytes)
    {
        if (bytes < 1024)
            return $"{bytes} B";
        else if (bytes < 1024 * 1024)
            return $"{bytes / 1024f:F2} KB";
        else
            return $"{bytes / (1024f * 1024f):F2} MB";
    }

    string FormatBytesPerSecond(float bytesPerSec)
    {
        if (bytesPerSec < 1024)
            return $"{bytesPerSec:F0} B/s";
        else if (bytesPerSec < 1024 * 1024)
            return $"{bytesPerSec / 1024f:F2} KB/s";
        else
            return $"{bytesPerSec / (1024f * 1024f):F2} MB/s";
    }

    public void ResetStatistics()
    {
        if (fullStateSync != null)
            fullStateSync.ResetStatistics();

        if (deltaSync != null)
            deltaSync.ResetStatistics();
    }
}
