export const getInitialCode = (language) => {
  switch (language) {
    case "javascript":
      return "// Write your JavaScript code here";
    case "python":
      return "# Write your Python code here";
    case "java":
      return `public class Main {
    public static void main(String[] args) {
        // Write your Java code here
    }
}`;
    case "cpp":
      return `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
    return 0;
}`;
    case "html":
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <!-- Write your HTML code here -->
</body>
</html>`;
    case "css":
      return `/* Write your CSS code here */`;
    default:
      return "// Write your code here";
  }
};
