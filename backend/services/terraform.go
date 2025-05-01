package service

import (
  "bytes"
  "os/exec"
)

// RunTerraform runs a stubbed terraform init & apply and returns (success, logOutput)
func RunTerraform(projectID string) (bool, string) {
  // in a real version you'd dynamically generate .tf files based on projectID
  buf := &bytes.Buffer{}

  cmds := [][]string{
    {"terraform", "init"},
    {"terraform", "apply", "-auto-approve"},
  }

  for _, args := range cmds {
    cmd := exec.Command(args[0], args[1:]...)
    cmd.Stdout = buf
    cmd.Stderr = buf
    if err := cmd.Run(); err != nil {
      return false, buf.String() + "\nError: " + err.Error()
    }
  }

  return true, buf.String()
}
