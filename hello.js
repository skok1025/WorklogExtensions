document.addEventListener("DOMContentLoaded", () => {

  function showCredentialsModal(callback) {
    const modal = document.getElementById("credentials-modal");
    const userIdInput = document.getElementById("user-id-input");
    const passwordInput = document.getElementById("password-input");
    const submitButton = document.getElementById("credentials-submit");
    const cancelButton = document.getElementById("credentials-cancel");

    // 모달 표시
    modal.style.display = "block";

    submitButton.onclick = () => {
      const inputUserId = userIdInput.value.trim(); // 새로운 변수 선언
      const inputPassword = passwordInput.value.trim(); // 새로운 변수 선언

      if (!inputUserId || !inputPassword) {
        alert("User ID와 Password를 모두 입력해야 합니다.");
        return;
      }

      modal.style.display = "none"; // 모달 숨기기
      userIdInput.value = ""; // 입력 필드 초기화
      passwordInput.value = ""; // 입력 필드 초기화
      callback({ userId: inputUserId, userPw: inputPassword }); // 입력된 값 반환
    };

    // 취소 버튼 클릭 처리
    cancelButton.onclick = () => {
      modal.style.display = "none"; // 모달 숨기기
      userIdInput.value = ""; // 입력 필드 초기화
      passwordInput.value = ""; // 입력 필드 초기화
      callback(null); // 취소 시 null 반환
    };
  }


  let timers = [];


  function calculateTotalElapsedTime() {
    return timers.reduce((total, timer) => total + (timer.isRunning ? Math.floor((Date.now() - timer.startTime) / 1000) : timer.elapsedTime), 0);
  }

  function getDynamicColor(totalSeconds) {
	  const maxBlueTime = 8 * 3600; // 8시간 (초 단위)

	  if (totalSeconds > maxBlueTime) {
		// 8시간 이후 빨간색 계열로 전환
		const excessTime = totalSeconds - maxBlueTime;
		const redIntensity = Math.min(100, (excessTime / 3600) * 25); // 최대 25% 밝기 증가
		return `hsl(0, 100%, ${50 + redIntensity}%)`; // 빨간색 (Hue = 0)
	  } else {
		// 8시간 이하 파란색 계열
		const progress = totalSeconds / maxBlueTime; // 진행 정도 (0 ~ 1)
		const lightness = 70 - Math.floor(progress * 40); // 70% → 30%로 감소
		return `hsl(220, 90%, ${lightness}%)`; // 눈에 잘 띄는 파란색 (Hue = 220)
	  }
  }


  function updateTotalElapsedTime() {
    const totalElapsedTime = calculateTotalElapsedTime();
    const totalElapsedTimeElement = document.getElementById("total-elapsed-time");
    totalElapsedTimeElement.textContent = `총 시간: ${formatTime(totalElapsedTime)}`;

	// 동적 색상 설정
	const dynamicColor = getDynamicColor(totalElapsedTime);
	totalElapsedTimeElement.style.color = dynamicColor;
  } 

  function saveTimers() {
    chrome.storage.local.set({ timers }, () => {
      console.log("Timers saved:", timers);
    });
  }

  function loadTimers() {
    chrome.storage.local.get("timers", (result) => {
      if (result.timers) {
        timers = result.timers;
        renderTimers();
      }
    });
  }

  function clearAllTimers() {
    if (!confirm("모든 Task를 삭제하시겠습니까?")) return;

    // 모든 타이머 정지
    timers.forEach((timer) => {
      if (timer.isRunning) {
        chrome.alarms.clear(`timer-${timers.indexOf(timer)}`);
      }
    });

    // 타이머 배열 초기화
    timers.length = 0;
    saveTimers(); // 저장
    renderTimers(); // UI 갱신
  }

  function renderTimers() {
    const timersContainer = document.getElementById("timers");
    timersContainer.innerHTML = "";

    // "모두 삭제" 버튼 추가
    if (timers.length > 0) {
      const clearAllButton = document.createElement("button");
      clearAllButton.textContent = "모두 삭제";
      clearAllButton.style.marginBottom = "10px";
      clearAllButton.style.backgroundColor = "#dc3545";
      clearAllButton.style.color = "white";
      clearAllButton.style.border = "none";
      clearAllButton.style.padding = "10px";
      clearAllButton.style.borderRadius = "5px";
      clearAllButton.style.cursor = "pointer";
      clearAllButton.addEventListener("click", clearAllTimers);
      timersContainer.appendChild(clearAllButton);
    }

    timers.forEach((timer, index) => {
      const elapsed = timer.isRunning
        ? Math.floor((Date.now() - timer.startTime) / 1000)
        : timer.elapsedTime;

      const timerCard = document.createElement("div");
      timerCard.className = "timer-card";

      // 진행 중인 타이머 강조
      if (timer.isRunning) {
        timerCard.style.backgroundColor = "#f0f8ff"; // 연한 파란색 배경
        timerCard.style.border = "2px solid #007bff"; // 강조 테두리
      }

      // 제출된 타이머는 배경색과 상태 변경
      if (timer.isSubmitted) {
        timerCard.style.backgroundColor = "#e9ecef"; // 회색 배경
        timerCard.style.border = "1px solid #ccc";
      }
      

      timerCard.innerHTML = `
      <p><strong>진행할 업무:</strong> ${timer.taskDesc}</p>
      <p>경과 시간: <span id="elapsed-${index}">${formatTime(elapsed)}</span></p>
	  
	  <p style="color: ${timer.isRunning ? '#007bff' : '#000'}; font-weight: bold;">
        ${timer.isRunning ? "진행 중..." : ""}
      </p>
      
	  <button id="start-${index}" ${timer.isRunning || timer.isSubmitted ? "disabled" : ""}>시작</button>
      <button id="pause-${index}" ${!timer.isRunning || timer.isSubmitted ? "disabled" : ""}>정지</button>
      <button id="reset-${index}" ${timer.isRunning || timer.isSubmitted ? "disabled" : ""}>리셋</button>
      <button id="delete-${index}" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer;">DEL</button>
    `;
      timersContainer.appendChild(timerCard);
    });

    bindTimerEvents();
	  updateTotalElapsedTime(); // 총 시간 업데이트
  }

  function bindTimerEvents() {
    timers.forEach((timer, index) => {
      const startButton = document.getElementById(`start-${index}`);
      const pauseButton = document.getElementById(`pause-${index}`);
      const resetButton = document.getElementById(`reset-${index}`);
      const submitButton = document.getElementById(`submit-${index}`);
	  const deleteButton = document.getElementById(`delete-${index}`);

      if (startButton) {
        startButton.addEventListener("click", () => startTimer(index));
      }
      if (pauseButton) {
        pauseButton.addEventListener("click", () => pauseTimer(index));
      }
      if (resetButton) {
        resetButton.addEventListener("click", () => resetTimer(index));
      }
	  if (deleteButton) {
		    deleteButton.addEventListener("click", () => deleteTimer(index));
	  }
    });
  }

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600); // 시간 계산
    const mins = Math.ceil((seconds % 3600) / 60); // 분 계산

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m`;
    } else {
      return "0m"; // 1분 이하일 경우
    }
  }

  function startTimer(index) {
    // 이미 실행 중인 Task 정지
    timers.forEach((timer, i) => {
      if (timer.isRunning) {
        pauseTimer(i); // 다른 Task 정지
      }
    });

    const timer = timers[index];
    if (timer.isRunning) return;

    timer.isRunning = true;
    timer.startTime = Date.now() - (timer.elapsedTime * 1000);

    // 알람 생성
    chrome.alarms.create(`timer-${index}`, { delayInMinutes: 1, periodInMinutes: 1 });
    saveTimers();
    renderTimers();
	  updateTotalElapsedTime(); // 총 시간 업데이트
  }

  // 개별 타이머 삭제 함수
  function deleteTimer(index) {
	  if (!confirm("정말 지우시겠어요?")) {
		  return;
	  }
	  timers.splice(index, 1); // 해당 타이머 제거
	  chrome.alarms.clear(`timer-${index}`);
	  saveTimers(); // 저장
	  renderTimers(); // UI 업데이트
    updateTotalElapsedTime(); // 총 시간 업데이트
  }

  function pauseTimer(index) {
    const timer = timers[index];
    if (!timer.isRunning) return;

    timer.isRunning = false;
    chrome.alarms.clear(`timer-${index}`);
    timer.elapsedTime = Math.floor((Date.now() - timer.startTime) / 1000);
    saveTimers();
    renderTimers();
	  updateTotalElapsedTime(); // 총 시간 업데이트
  }

  function resetTimer(index) {
    const timer = timers[index];
    pauseTimer(index);
    timer.elapsedTime = 0;
    timer.startTime = null;
    timer.isSubmitted = false;
    saveTimers();
    renderTimers();
	  updateTotalElapsedTime(); // 총 시간 업데이트
  }

  function getChromeStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key] || null);
        }
      });
    });
  }
  
  function addTimer() {
    const taskDescInput = document.getElementById("task-desc");
    const taskDesc = taskDescInput.value.trim();

    if (!taskDesc) {
      alert("진행할 업무를 입력해주세요!");
      return;
    }

    timers.push({
      taskDesc, // 진행할 업무 추가
      elapsedTime: 0,
      isRunning: false,
      startTime: null,
      isSubmitted: false,
    });

    taskDescInput.value = ""; // 업무 입력 초기화
    saveTimers();
    renderTimers();
  }

  loadTimers();

  const addTimerButton = document.getElementById("add-timer-button");
  addTimerButton.addEventListener("click", addTimer);

  window.addEventListener("beforeunload", () => {
    saveTimers();
  });

  // 암호화 및 복호화 유틸리티 함수 정의
  async function generateKey() {
    return crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptData(data, key) {
    const encodedData = new TextEncoder().encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization Vector
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    );
    return { encryptedData, iv };
  }

  async function decryptData(encryptedData, iv, key) {
    try {
      console.log("Decrypting Data...");
      console.log("IV:", iv);
      console.log("Key:", key);
      console.log("Encrypted Data:", encryptedData);
  
      const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encryptedData
      );
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error("Decryption Failed:", error);
      if (error.name === "OperationError") {
        console.error("Likely a mismatch between encryption and decryption keys or IV.");
      } else if (error.name === "DOMException") {
        console.error("Encrypted data format may be incorrect.");
      }
      throw new Error("Decryption failed. Please check the key, IV, and encrypted data.");
    }
  }

  // 크롬 스토리지에서 키를 저장 및 로드
  async function getKey() {
    const storedKey = await new Promise((resolve) => {
      chrome.storage.local.get("encryptionKey", (result) => {
        resolve(result.encryptionKey || null);
      });
    });

    if (storedKey) {
      return crypto.subtle.importKey(
        "raw",
        new Uint8Array(storedKey),
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
      );
    }

    const key = await generateKey();
    const exportedKey = await crypto.subtle.exportKey("raw", key);
    chrome.storage.local.set({ encryptionKey: Array.from(new Uint8Array(exportedKey)) });
    return key;
  }

});

// Background Event Listener
chrome.alarms.onAlarm.addListener((alarm) => {
  const timerIndex = parseInt(alarm.name.replace("timer-", ""));
  chrome.storage.local.get("timers", (result) => {
    if (result.timers) {
      const timers = result.timers;
      const timer = timers[timerIndex];
      if (timer && timer.isRunning) {
        timer.elapsedTime = Math.floor((Date.now() - timer.startTime) / 1000);
        chrome.storage.local.set({ timers });
      }
    }
  });
});

function extractIssueId(url) {
  const match = url.match(/browse\/([A-Z]+-\d+)/);
  return match ? match[1] : null;
}