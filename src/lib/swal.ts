"use client";

import Swal, { SweetAlertResult } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// Préréglages cohérents avec le design (stone/amber).
// Toutes les fonctions sont safe-by-default : si le user annule, on renvoie false.

const baseClasses = {
  popup: "!rounded-3xl !p-6 !shadow-2xl",
  title: "!text-stone-900 !font-bold !text-xl !tracking-tight",
  htmlContainer: "!text-stone-600 !text-sm",
  confirmButton:
    "!rounded-full !px-5 !py-2.5 !text-sm !font-semibold !shadow-md",
  cancelButton:
    "!rounded-full !px-5 !py-2.5 !text-sm !font-semibold !bg-stone-100 !text-stone-700 hover:!bg-stone-200",
  actions: "!gap-2 !mt-2",
  icon: "!my-2",
};

export async function confirmDanger(opts: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  const result: SweetAlertResult = await Swal.fire({
    icon: "warning",
    title: opts.title,
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? "Supprimer",
    cancelButtonText: opts.cancelText ?? "Annuler",
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      ...baseClasses,
      confirmButton: `${baseClasses.confirmButton} !bg-red-600 hover:!bg-red-700 !text-white`,
    },
  });
  return result.isConfirmed;
}

export async function confirmAction(opts: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  const result: SweetAlertResult = await Swal.fire({
    icon: "question",
    title: opts.title,
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? "Confirmer",
    cancelButtonText: opts.cancelText ?? "Annuler",
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      ...baseClasses,
      confirmButton: `${baseClasses.confirmButton} !bg-stone-900 hover:!bg-stone-800 !text-white`,
    },
  });
  return result.isConfirmed;
}

export async function toastSuccess(message: string): Promise<void> {
  await Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    buttonsStyling: false,
    customClass: {
      popup: "!rounded-2xl !shadow-lg !px-4 !py-3",
      title: "!text-stone-900 !text-sm !font-medium",
    },
  });
}

export async function toastError(message: string): Promise<void> {
  await Swal.fire({
    toast: true,
    position: "top-end",
    icon: "error",
    title: message,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    buttonsStyling: false,
    customClass: {
      popup: "!rounded-2xl !shadow-lg !px-4 !py-3",
      title: "!text-stone-900 !text-sm !font-medium",
    },
  });
}

export async function alertLowStock(productName: string, quantity: number): Promise<void> {
  await Swal.fire({
    icon: "warning",
    title: "Stock presque épuisé !",
    html: `Le produit <strong class="text-stone-900 font-bold">${productName}</strong> n'a plus que <span class="text-amber-600 font-extrabold">${quantity}</span> unités en stock.`,
    confirmButtonText: "Compris",
    buttonsStyling: false,
    customClass: {
      popup: "!rounded-3xl !p-6 !shadow-2xl",
      title: "!text-stone-900 !font-bold !text-xl !tracking-tight",
      htmlContainer: "!text-stone-600 !text-sm !mt-2",
      confirmButton: "!rounded-full !px-6 !py-2.5 !text-sm !font-semibold !bg-amber-500 hover:!bg-amber-600 !text-stone-950 !shadow-md",
    },
  });
}
