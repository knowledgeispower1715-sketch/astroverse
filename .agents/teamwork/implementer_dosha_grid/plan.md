# Plan - DoshaGrid3D Loading State

1.  **Update `DoshaGrid3D`**:
    - Add `isLoading` prop to `DoshaGrid3DProps`.
    - If `isLoading` is true, render a loading spinner (`ActivityIndicator`).
    - Import `ActivityIndicator` from `react-native`.

2.  **Update `ChartScreen`**:
    - Pass `isLoading` prop to `DoshaGrid3D`.

3.  **Verify**:
    - Create a test component or mock to verify `DoshaGrid3D` renders correctly.
    - Wait, the project likely has tests already. I should check `apps/mobile/src/components/DoshaGrid3D.test.tsx` if it exists.

4.  **Finalize**:
    - Update `handoff.md`.
