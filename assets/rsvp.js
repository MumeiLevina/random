(() => {
  "use strict";
  const form = document.querySelector(".rsvp-card");
  if (!form) return;
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector(".rsvp-status");
  const edit = form.querySelector(".rsvp-edit");
  const attendingFields = form.querySelector(".rsvp-attending-fields");
  const eventInputs = [...form.querySelectorAll('[name="events"]')];
  const nameInput = form.elements.namedItem("name");
  const config = window.WEDDING_RSVP || {};
  let state = "idle";

  function setState(next, message = "") {
    state = next;
    form.dataset.rsvpState = next;
    form.setAttribute("aria-busy", String(next === "sending"));
    button.disabled = next === "sending" || next === "success";
    button.innerHTML =
      next === "sending"
        ? "Đang gửi lời hồi đáp…"
        : 'Gửi lời hồi đáp <span aria-hidden="true">↗</span>';
    edit.hidden = next !== "success";
    status.textContent = message;
    status.setAttribute("role", next === "error" ? "alert" : "status");
  }
  function updateAttendance() {
    const attending = form.elements.namedItem("attendance").value === "yes";
    attendingFields.hidden = !attending;
    attendingFields.querySelectorAll("input,select").forEach((input) => {
      input.disabled = !attending;
    });
    eventInputs[0].setCustomValidity("");
  }
  form
    .querySelectorAll('[name="attendance"]')
    .forEach((input) => input.addEventListener("change", updateAttendance));
  eventInputs.forEach((input) =>
    input.addEventListener("change", () =>
      eventInputs[0].setCustomValidity(""),
    ),
  );
  nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
  edit.addEventListener("click", () => {
    form.reset();
    updateAttendance();
    setState("idle");
    nameInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state === "sending" || state === "success") return;
    const name = nameInput.value.trim();
    nameInput.setCustomValidity(
      name ? "" : "Bạn vui lòng cho gia đình biết tên nhé.",
    );
    const attendance = form.elements.namedItem("attendance").value;
    const selectedEvents = eventInputs
      .filter((input) => input.checked)
      .map((input) => input.value);
    eventInputs[0].setCustomValidity(
      attendance === "yes" && !selectedEvents.length
        ? "Bạn chọn ít nhất một ngày tham dự nhé."
        : "",
    );
    if (!form.reportValidity()) return;
    // A honeypot never produces a fake success notification.
    if (form.elements.namedItem("_honey").value) return;
    if (
      !/^https:\/\/formsubmit\.co\/ajax\/[^\s/]+$/.test(config.endpoint || "")
    ) {
      setState(
        "error",
        "Chưa kết nối được nơi nhận hồi đáp. Bạn vui lòng thử lại sau.",
      );
      status.focus();
      return;
    }
    const email = form.elements.namedItem("email").value.trim();
    const payload = {
      _subject: "Hồi đáp lễ cưới | Quốc Hảo & Thùy Trang",
      _template: "table",
      _honey: "",
      "Họ và tên": name,
      "Tham dự": {
        yes: "Sẽ đến chung vui",
        no: "Không thể tham dự",
        maybe: "Sẽ xác nhận sau",
      }[attendance],
      "Ngày tham dự":
        attendance === "yes" ? selectedEvents.join("; ") : "Chưa đăng ký",
      "Số người":
        attendance === "yes" ? form.elements.namedItem("guests").value : "0",
      "Lời nhắn":
        form.elements.namedItem("message").value.trim() || "Không có lời nhắn",
      "Trang gửi": location.href.split(/[?#]/)[0],
    };
    if (email) {
      payload.email = email;
      payload._replyto = email;
    }
    setState(
      "sending",
      "Đang chuyển lời hồi đáp đến gia đình. Bạn chờ một chút nhé.",
    );
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs || 15000,
    );
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("service");
      const result = await response.json();
      if (
        /activat|confirm.*email|verify.*email/i.test(
          String(result.message || ""),
        )
      ) {
        setState(
          "error",
          "Email nhận hồi đáp đang chờ gia đình kích hoạt. Lời hồi đáp của bạn chưa được xác nhận; vui lòng gửi lại sau nhé.",
        );
      } else if (result.success === true || result.success === "true") {
        setState(
          "success",
          `Cảm ơn ${name}. Lời hồi đáp của bạn đã được chuyển qua dịch vụ gửi email đến gia đình. ${attendance === "yes" ? "Hẹn gặp bạn trong ngày vui của chúng mình." : "Hai gia đình trân trọng lời hồi đáp của bạn."}`,
        );
      } else {
        throw new Error("service");
      }
    } catch (error) {
      setState(
        "error",
        error.name === "AbortError"
          ? "Kết nối quá lâu nên chưa xác nhận được kết quả gửi. Thông tin của bạn vẫn còn ở đây; bạn có thể thử lại khi mạng ổn định."
          : "Chưa xác nhận được lời hồi đáp đã gửi. Thông tin của bạn vẫn được giữ trong form; bạn vui lòng thử lại nhé.",
      );
    } finally {
      clearTimeout(timeout);
    }
    status.focus();
  });
  updateAttendance();
})();
