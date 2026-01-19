using UnityEngine;

/// <summary>
/// 플레이어 움직임을 시뮬레이션하는 스크립트
/// 랜덤하게 움직이거나 정지함
/// </summary>
public class PlayerMovement : MonoBehaviour
{
    [Header("Movement Settings")]
    public float moveSpeed = 2f;
    public float rotationSpeed = 90f;
    public float moveChangeInterval = 2f; // 방향 변경 주기
    public float stopProbability = 0.3f;  // 정지 확률

    private Vector3 moveDirection;
    private float nextMoveChangeTime;
    private bool isMoving = true;

    void Start()
    {
        ChangeMovementDirection();
    }

    void Update()
    {
        if (Time.time >= nextMoveChangeTime)
        {
            ChangeMovementDirection();
            nextMoveChangeTime = Time.time + moveChangeInterval;
        }

        if (isMoving)
        {
            // 이동
            transform.position += moveDirection * moveSpeed * Time.deltaTime;

            // 회전
            if (moveDirection != Vector3.zero)
            {
                Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
                transform.rotation = Quaternion.RotateTowards(
                    transform.rotation,
                    targetRotation,
                    rotationSpeed * Time.deltaTime
                );
            }

            // 경계 체크 (화면 밖으로 나가지 않게)
            Vector3 pos = transform.position;
            pos.x = Mathf.Clamp(pos.x, -10f, 10f);
            pos.z = Mathf.Clamp(pos.z, -10f, 10f);
            transform.position = pos;
        }
    }

    void ChangeMovementDirection()
    {
        // 30% 확률로 정지
        if (Random.value < stopProbability)
        {
            isMoving = false;
            moveDirection = Vector3.zero;
        }
        else
        {
            isMoving = true;
            // 랜덤 방향
            float angle = Random.Range(0f, 360f);
            moveDirection = new Vector3(
                Mathf.Cos(angle * Mathf.Deg2Rad),
                0f,
                Mathf.Sin(angle * Mathf.Deg2Rad)
            ).normalized;
        }
    }
}
