#define NOMINMAX
#include <windows.h>
#include <stdio.h>
#include <vector>
#include <algorithm>
#include <cmath>

const int MAX_TRACK = 200;  // 0 ~ 199

struct Result {
    const char* name;
    std::vector<int> order;
    int totalMovement;
};

void PrintResult(const Result& r, int startPos) {
    printf("\n[%s]\n", r.name);
    printf("  Movement: %d -> ", startPos);
    for (size_t i = 0; i < r.order.size(); i++) {
        printf("%d", r.order[i]);
        if (i < r.order.size() - 1) printf(" -> ");
    }
    printf("\n");
    printf("  Total head movement: %d tracks\n", r.totalMovement);
}

// FCFS: First Come First Serve
Result FCFS(int startPos, std::vector<int> requests) {
    Result r;
    r.name = "FCFS (First Come First Serve)";
    r.totalMovement = 0;
    r.order = requests;

    int current = startPos;
    for (int req : requests) {
        r.totalMovement += abs(req - current);
        current = req;
    }

    return r;
}

// SSTF: Shortest Seek Time First
Result SSTF(int startPos, std::vector<int> requests) {
    Result r;
    r.name = "SSTF (Shortest Seek Time First)";
    r.totalMovement = 0;

    std::vector<bool> done(requests.size(), false);
    int current = startPos;

    for (size_t i = 0; i < requests.size(); i++) {
        int minDist = INT_MAX;
        int minIdx = -1;

        for (size_t j = 0; j < requests.size(); j++) {
            if (!done[j]) {
                int dist = abs(requests[j] - current);
                if (dist < minDist) {
                    minDist = dist;
                    minIdx = (int)j;
                }
            }
        }

        done[minIdx] = true;
        r.order.push_back(requests[minIdx]);
        r.totalMovement += minDist;
        current = requests[minIdx];
    }

    return r;
}

// SCAN: Elevator Algorithm
Result SCAN(int startPos, std::vector<int> requests, bool directionUp) {
    Result r;
    r.name = directionUp ? "SCAN (Elevator - going UP first)" : "SCAN (Elevator - going DOWN first)";
    r.totalMovement = 0;

    std::vector<int> lower, upper;
    for (int req : requests) {
        if (req < startPos) lower.push_back(req);
        else upper.push_back(req);
    }

    std::sort(lower.begin(), lower.end());
    std::sort(upper.begin(), upper.end());

    int current = startPos;

    if (directionUp) {
        // Go up first
        for (int req : upper) {
            r.order.push_back(req);
            r.totalMovement += abs(req - current);
            current = req;
        }
        // Go to end
        if (!upper.empty() || !lower.empty()) {
            r.totalMovement += abs((MAX_TRACK - 1) - current);
            current = MAX_TRACK - 1;
        }
        // Go down
        for (int i = (int)lower.size() - 1; i >= 0; i--) {
            r.order.push_back(lower[i]);
            r.totalMovement += abs(lower[i] - current);
            current = lower[i];
        }
    } else {
        // Go down first
        for (int i = (int)lower.size() - 1; i >= 0; i--) {
            r.order.push_back(lower[i]);
            r.totalMovement += abs(lower[i] - current);
            current = lower[i];
        }
        // Go to start
        if (!upper.empty() || !lower.empty()) {
            r.totalMovement += abs(0 - current);
            current = 0;
        }
        // Go up
        for (int req : upper) {
            r.order.push_back(req);
            r.totalMovement += abs(req - current);
            current = req;
        }
    }

    return r;
}

// C-SCAN: Circular SCAN
Result CSCAN(int startPos, std::vector<int> requests) {
    Result r;
    r.name = "C-SCAN (Circular SCAN - always UP)";
    r.totalMovement = 0;

    std::vector<int> lower, upper;
    for (int req : requests) {
        if (req < startPos) lower.push_back(req);
        else upper.push_back(req);
    }

    std::sort(lower.begin(), lower.end());
    std::sort(upper.begin(), upper.end());

    int current = startPos;

    // Go up first
    for (int req : upper) {
        r.order.push_back(req);
        r.totalMovement += abs(req - current);
        current = req;
    }

    // Go to end, then jump to 0
    if (!lower.empty()) {
        r.totalMovement += abs((MAX_TRACK - 1) - current);  // to end
        r.totalMovement += (MAX_TRACK - 1);                  // jump to 0 (counted as movement)
        current = 0;

        // Continue from 0
        for (int req : lower) {
            r.order.push_back(req);
            r.totalMovement += abs(req - current);
            current = req;
        }
    }

    return r;
}

// Starvation Demo for SSTF
void StarvationDemo() {
    printf("\n==========================================\n");
    printf(" [Starvation Demo] SSTF with clustered requests\n");
    printf("==========================================\n");

    int startPos = 50;
    std::vector<int> requests = {45, 55, 48, 52, 49, 51, 190};  // 190 is far

    printf("\n  Start: %d\n", startPos);
    printf("  Requests: ");
    for (int r : requests) printf("%d ", r);
    printf("\n");
    printf("  Notice: 190 is far, others are near 50\n");

    Result sstf = SSTF(startPos, requests);
    PrintResult(sstf, startPos);

    printf("\n  -> Track 190 processed LAST!\n");
    printf("  -> If more requests near 50 keep coming, 190 STARVES.\n");
}

int main() {
    printf("\n");
    printf("########################################\n");
    printf("#  Disk Scheduling Algorithm Simulator #\n");
    printf("########################################\n");

    // Test data
    int startPos = 50;
    std::vector<int> requests = {82, 170, 43, 140, 24, 16, 190};

    printf("\n==========================================\n");
    printf(" Test Data\n");
    printf("==========================================\n");
    printf("\n  Disk tracks: 0 ~ %d\n", MAX_TRACK - 1);
    printf("  Head start position: %d\n", startPos);
    printf("  Requests (arrival order): ");
    for (int r : requests) printf("%d ", r);
    printf("\n");

    printf("\n==========================================\n");
    printf(" Algorithm Comparison\n");
    printf("==========================================\n");

    Result fcfs = FCFS(startPos, requests);
    Result sstf = SSTF(startPos, requests);
    Result scan = SCAN(startPos, requests, true);
    Result cscan = CSCAN(startPos, requests);

    PrintResult(fcfs, startPos);
    PrintResult(sstf, startPos);
    PrintResult(scan, startPos);
    PrintResult(cscan, startPos);

    // Summary
    printf("\n==========================================\n");
    printf(" Summary\n");
    printf("==========================================\n");
    printf("\n  Algorithm      Total Movement   Starvation?\n");
    printf("  ----------------------------------------------\n");
    printf("  FCFS           %3d tracks       No\n", fcfs.totalMovement);
    printf("  SSTF           %3d tracks       YES!\n", sstf.totalMovement);
    printf("  SCAN           %3d tracks       No\n", scan.totalMovement);
    printf("  C-SCAN         %3d tracks       No\n", cscan.totalMovement);

    printf("\n  Winner (least movement): ");
    int minMove = std::min({fcfs.totalMovement, sstf.totalMovement,
                           scan.totalMovement, cscan.totalMovement});
    if (sstf.totalMovement == minMove) printf("SSTF");
    else if (scan.totalMovement == minMove) printf("SCAN");
    else if (cscan.totalMovement == minMove) printf("C-SCAN");
    else printf("FCFS");
    printf(" (%d tracks)\n", minMove);

    printf("\n  But SSTF has starvation risk!\n");
    printf("  Real systems use SCAN or C-SCAN.\n");

    // Starvation demo
    StarvationDemo();

    printf("\n==========================================\n");
    printf(" Real World\n");
    printf("==========================================\n");
    printf("\n  HDD: SCAN, C-SCAN (head movement matters)\n");
    printf("  SSD: FCFS or NOOP (no head, all same speed)\n");
    printf("\n");

    printf("Press any key to exit...\n");
    getchar();

    return 0;
}
