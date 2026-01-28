import { useEffect } from "react";

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl animate-fadeIn">
        <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>

        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to log out?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
