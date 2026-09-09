import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import PolicyStatement from "./PolicyStatement";
import AccessForm from "../RestrictedAccess/AccessForm";

const RestrictedAccessFlow = ({ isOpen, onClose, book, onSuccess }) => {
  const [step, setStep] = useState("policy"); // policy | request

  useEffect(() => {
    if (isOpen) {
      setStep("policy");
    }
  }, [isOpen]);

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#00152e]/80 backdrop-blur-sm">
      <div
        className={`
          bg-white rounded-2xl shadow-2xl
          w-full ${step === "policy" ? "max-w-3xl" : "max-w-2xl"}
          max-h-[95vh]
          flex flex-col
          relative
          overflow-hidden
        `}
      >
        {/* Close button for policy step only (AccessForm has its own integrated header close button) */}
        {step === "policy" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-slate-100 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}

        {step === "policy" && (
          <PolicyStatement
            onAccept={() => setStep("request")}
            onCancel={onClose}
          />
        )}

        {step === "request" && (
          <AccessForm
            book={book}
            onCancel={onClose}
            onSuccess={() => {
              onClose();     // 🔥 close this modal
              onSuccess();   // 🔥 tell parent to open success modal
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RestrictedAccessFlow;
