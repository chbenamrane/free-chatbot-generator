"use client";

// SweetAlert2 dialogs and toasts, themed with the app's CSS variables (light and dark).
import Swal from "sweetalert2";

const base = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  customClass: {
    popup: "swal-popup",
    title: "swal-title",
    htmlContainer: "swal-text",
    confirmButton: "swal-btn swal-btn-confirm",
    cancelButton: "swal-btn swal-btn-cancel",
  },
});

type ConfirmOptions = { title: string; text?: string; confirmText?: string; cancelText?: string; danger?: boolean };

// Resolves to true when the user confirms.
export async function confirmDialog({ title, text, confirmText = "Confirm", cancelText = "Cancel", danger = false }: ConfirmOptions) {
  const result = await base.fire({
    icon: danger ? "warning" : "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      popup: "swal-popup",
      title: "swal-title",
      htmlContainer: "swal-text",
      confirmButton: `swal-btn ${danger ? "swal-btn-danger" : "swal-btn-confirm"}`,
      cancelButton: "swal-btn swal-btn-cancel",
    },
  });
  return result.isConfirmed;
}

export const confirmDelete = (title: string, text = "This cannot be undone.") =>
  confirmDialog({ title, text, confirmText: "Delete", danger: true });

export function toast(message: string, icon: "success" | "error" | "info" = "success") {
  return base.fire({
    toast: true,
    position: "bottom-end",
    icon,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: { popup: "swal-popup swal-toast", title: "swal-title" },
  });
}
