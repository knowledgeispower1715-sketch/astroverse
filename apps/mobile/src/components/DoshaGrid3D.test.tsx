import React from "react";
import { render } from "@testing-library/react-native";
import { DoshaGrid3D } from "./DoshaGrid3D";
import { ActivityIndicator } from "react-native";

// Mock ActivityIndicator
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.ActivityIndicator = () => "ActivityIndicator";
  return RN;
});

describe("DoshaGrid3D", () => {
  it("renders ActivityIndicator when isLoading is true", () => {
    const { getByText } = render(<DoshaGrid3D data={null} isLoading={true} />);
    expect(getByText("ActivityIndicator")).toBeDefined();
  });

  it("renders data when isLoading is false", () => {
    const mockData = {
      manglik: { has_dosha: true },
      kaal_sarp: { has_dosha: false },
      sade_sati: { phase: "Peak" },
    };
    const { getByText } = render(
      <DoshaGrid3D data={mockData} isLoading={false} />,
    );
    expect(getByText("Dosha Present")).toBeDefined();
    expect(getByText("Not Present")).toBeDefined();
    expect(getByText("Peak")).toBeDefined();
  });
});
