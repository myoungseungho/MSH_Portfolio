#define NOMINMAX
#include <windows.h>
#include <stdio.h>
#pragma warning(disable: 4996)
#include <vector>
#include <algorithm>
#include <queue>
#include <string>

struct Process {
    std::string name;
    int arrival;      // 도착 시간
    int burst;        // 실행 시간
    int priority;     // 우선순위 (낮을수록 높음)

    // 결과
    int start;        // 첫 실행 시간
    int finish;       // 완료 시간
    int waiting;      // 대기 시간
    int turnaround;   // 반환 시간
    int response;     // 응답 시간

    // 시뮬레이션용
    int remaining;    // 남은 실행 시간
    bool started;
};

void PrintResults(const char* algorithm, std::vector<Process>& processes) {
    printf("\n[%s]\n", algorithm);
    printf("  %-6s  %-6s  %-6s  %-8s  %-8s  %-8s\n",
           "Name", "Arrive", "Burst", "Waiting", "Turnaround", "Response");
    printf("  -------------------------------------------------------\n");

    double totalWait = 0, totalTurn = 0, totalResp = 0;

    for (auto& p : processes) {
        printf("  %-6s  %-6d  %-6d  %-8d  %-8d  %-8d\n",
               p.name.c_str(), p.arrival, p.burst,
               p.waiting, p.turnaround, p.response);
        totalWait += p.waiting;
        totalTurn += p.turnaround;
        totalResp += p.response;
    }

    int n = (int)processes.size();
    printf("  -------------------------------------------------------\n");
    printf("  Average:          %-8.1f  %-8.1f  %-8.1f\n",
           totalWait / n, totalTurn / n, totalResp / n);
}

// FCFS: First Come First Serve
void FCFS(std::vector<Process> processes) {
    std::sort(processes.begin(), processes.end(),
              [](const Process& a, const Process& b) {
                  return a.arrival < b.arrival;
              });

    int time = 0;
    for (auto& p : processes) {
        if (time < p.arrival) time = p.arrival;

        p.start = time;
        p.response = p.start - p.arrival;
        p.finish = time + p.burst;
        p.waiting = p.start - p.arrival;
        p.turnaround = p.finish - p.arrival;

        time = p.finish;
    }

    PrintResults("FCFS (First Come First Serve)", processes);
}

// SJF: Shortest Job First (Non-preemptive)
void SJF(std::vector<Process> processes) {
    int n = (int)processes.size();
    std::vector<bool> done(n, false);
    int completed = 0;
    int time = 0;

    while (completed < n) {
        int shortest = -1;
        int minBurst = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (!done[i] && processes[i].arrival <= time) {
                if (processes[i].burst < minBurst) {
                    minBurst = processes[i].burst;
                    shortest = i;
                }
            }
        }

        if (shortest == -1) {
            time++;
            continue;
        }

        Process& p = processes[shortest];
        p.start = time;
        p.response = p.start - p.arrival;
        p.finish = time + p.burst;
        p.waiting = p.start - p.arrival;
        p.turnaround = p.finish - p.arrival;

        time = p.finish;
        done[shortest] = true;
        completed++;
    }

    PrintResults("SJF (Shortest Job First)", processes);
}

// Round Robin
void RoundRobin(std::vector<Process> processes, int quantum) {
    int n = (int)processes.size();

    for (auto& p : processes) {
        p.remaining = p.burst;
        p.started = false;
        p.waiting = 0;
    }

    std::sort(processes.begin(), processes.end(),
              [](const Process& a, const Process& b) {
                  return a.arrival < b.arrival;
              });

    std::queue<int> ready;
    int time = 0;
    int completed = 0;
    int idx = 0;

    // Add first process
    while (idx < n && processes[idx].arrival <= time) {
        ready.push(idx++);
    }

    if (ready.empty() && idx < n) {
        time = processes[idx].arrival;
        ready.push(idx++);
    }

    while (completed < n) {
        if (ready.empty()) {
            if (idx < n) {
                time = processes[idx].arrival;
                ready.push(idx++);
            }
            continue;
        }

        int curr = ready.front();
        ready.pop();

        Process& p = processes[curr];

        if (!p.started) {
            p.start = time;
            p.response = p.start - p.arrival;
            p.started = true;
        }

        int execTime = std::min(quantum, p.remaining);
        time += execTime;
        p.remaining -= execTime;

        // Add newly arrived processes
        while (idx < n && processes[idx].arrival <= time) {
            ready.push(idx++);
        }

        if (p.remaining > 0) {
            ready.push(curr);
        } else {
            p.finish = time;
            p.turnaround = p.finish - p.arrival;
            p.waiting = p.turnaround - p.burst;
            completed++;
        }
    }

    char title[64];
    sprintf(title, "Round Robin (Quantum=%d)", quantum);
    PrintResults(title, processes);
}

// Priority Scheduling (Non-preemptive)
void PriorityScheduling(std::vector<Process> processes) {
    int n = (int)processes.size();
    std::vector<bool> done(n, false);
    int completed = 0;
    int time = 0;

    while (completed < n) {
        int highest = -1;
        int minPriority = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (!done[i] && processes[i].arrival <= time) {
                if (processes[i].priority < minPriority) {
                    minPriority = processes[i].priority;
                    highest = i;
                }
            }
        }

        if (highest == -1) {
            time++;
            continue;
        }

        Process& p = processes[highest];
        p.start = time;
        p.response = p.start - p.arrival;
        p.finish = time + p.burst;
        p.waiting = p.start - p.arrival;
        p.turnaround = p.finish - p.arrival;

        time = p.finish;
        done[highest] = true;
        completed++;
    }

    PrintResults("Priority Scheduling (lower=higher priority)", processes);
}

// Starvation demonstration
void StarvationDemo() {
    printf("\n==========================================\n");
    printf(" [Starvation Demo] SJF with continuous short jobs\n");
    printf("==========================================\n");

    std::vector<Process> processes = {
        {"Long",  0, 100, 5},  // 긴 작업 먼저 도착
        {"Short1", 1, 5, 1},
        {"Short2", 2, 5, 1},
        {"Short3", 3, 5, 1},
        {"Short4", 4, 5, 1},
        {"Short5", 5, 5, 1},
    };

    printf("\n  Process 'Long' (burst=100) arrives at t=0\n");
    printf("  Short jobs (burst=5) keep arriving at t=1,2,3,4,5\n\n");

    SJF(processes);

    printf("\n  -> 'Long' waits %d time units!\n",
           processes[0].waiting);
    printf("  -> If more short jobs kept coming, 'Long' would STARVE.\n");
}

int main() {
    printf("\n");
    printf("########################################\n");
    printf("#  CPU Scheduling Algorithm Simulator  #\n");
    printf("########################################\n");

    // Test processes
    std::vector<Process> processes = {
        // name, arrival, burst, priority
        {"P1", 0,  10, 3},
        {"P2", 1,   5, 1},
        {"P3", 2,   8, 4},
        {"P4", 3,   2, 2},
        {"P5", 4,   7, 5},
    };

    printf("\n==========================================\n");
    printf(" Test Data\n");
    printf("==========================================\n");
    printf("\n  %-6s  %-8s  %-8s  %-8s\n", "Name", "Arrival", "Burst", "Priority");
    printf("  -----------------------------------------\n");
    for (auto& p : processes) {
        printf("  %-6s  %-8d  %-8d  %-8d\n",
               p.name.c_str(), p.arrival, p.burst, p.priority);
    }

    printf("\n==========================================\n");
    printf(" Algorithm Comparison\n");
    printf("==========================================\n");

    FCFS(processes);
    SJF(processes);
    RoundRobin(processes, 4);
    RoundRobin(processes, 2);
    PriorityScheduling(processes);

    // Starvation demo
    StarvationDemo();

    // Summary
    printf("\n==========================================\n");
    printf(" Summary\n");
    printf("==========================================\n");
    printf("\n  Algorithm          Avg Wait   Avg Turn   Starvation?\n");
    printf("  -----------------------------------------------------\n");
    printf("  FCFS               High       High       No\n");
    printf("  SJF                Lowest     Low        YES!\n");
    printf("  Round Robin        Medium     Medium     No\n");
    printf("  Priority           Varies     Varies     YES!\n");
    printf("\n");
    printf("  Trade-off:\n");
    printf("  - SJF: Best avg wait, but starvation risk\n");
    printf("  - RR:  Fair, but context switch overhead\n");
    printf("  - Priority: Important first, but starvation risk\n");
    printf("  - MLFQ: Combines all (used in real OS)\n");
    printf("\n");

    printf("Press any key to exit...\n");
    getchar();

    return 0;
}
