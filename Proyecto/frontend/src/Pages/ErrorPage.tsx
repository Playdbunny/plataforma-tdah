import {
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom";
import { extractErrorMessage } from "../utils/errorMessage";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  let title = "Unexpected Application Error!";
  let message = "Ocurrió un error inesperado. Intenta de nuevo más tarde.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    const data = error.data as unknown;
    if (typeof data === "string") {
      message = data;
    } else if (data && typeof data === "object") {
      if (typeof (data as { message?: unknown }).message === "string") {
        message = (data as { message: string }).message;
      } else if (typeof (data as { error?: unknown }).error === "string") {
        message = (data as { error: string }).error;
      }
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object") {
    message = extractErrorMessage(error, message);
  }

  return (
    <div
      id="error-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}