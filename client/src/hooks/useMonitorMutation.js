import { useMutation } from "@tanstack/react-query";
import { baseUrl } from "../constants/contants";

const create = async (payload) => {
  const isDev = import.meta.env.DEV;
  const url = isDev
    ? "/api/jobs/check-price"
    : `${baseUrl}/api/jobs/check-price`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result?.message || "Unknown error");
    }

    return result;
  } catch (error) {
    console.error("Error checking price:", error.message);
    throw error; // Let React Query handle the error properly
  }
};

const useMonitorMutation = () => {
  return useMutation({
    mutationKey: ["monitor"],
    mutationFn: create,
    onSuccess: (data) => {
      console.log("Monitor success:", data);
    },
    onError: (error) => {
      console.error("Monitor failed:", error.message);
    },
  });
};

export default useMonitorMutation;
