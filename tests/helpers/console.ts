import { jest } from "@jest/globals";

export function suppressConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}

export function suppressConsoleLog() {
  return jest.spyOn(console, "log").mockImplementation(() => {});
}
