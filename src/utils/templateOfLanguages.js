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
    case "c++":
      return `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
    return 0;
}`;
    case "ruby":
      return "# Write your Ruby code here";
    case "rust":
      return `fn main() {
    // Write your Rust code here
}`;
    case "c#":
      return `using System;

class Program {
    static void Main() {
        // Write your C# code here
    }
}`;
    case "c":
      return `#include <stdio.h>

int main() {
    // Write your C code here
    return 0;
}`;
    default:
      return "// Write your code here";
  }
};
