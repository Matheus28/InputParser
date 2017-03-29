# InputParser

## What?

This is simple library that generates a parser in C that will split up test cases of a CodeJam problem, useful if we want to parallelize them.

## Instructions

`%d` will generate a program that will scanf an int (`%d`), then print it back.

`5*%d` will do the same thing as the last program, but with 5 integers instead of 1.

`%d*%d` will scan an integer `n`, then scan `n` other integers. It could also be written as `n=%d n*%d`.

`%d*(%d %d)` will scan an integer `t` (which is usually the numeber of test cases), then repeat `t` times the stuff in the parenthesis: scan 2 integers.

For the previous code, if we want to have a special character between each test case. We convert that code to `%d*(%d %d @)`, the @ will be replaced by some code that will separate the input. But the problem now is that `t`, which is the number of test cases, will also be printed, so it'll be part of the first input. To fix that, we just need to make it not print it back after reading it. For that, we just have to silence it (adding an `*` immediately after the `%`): `%*d*(%d %d @)`.

If we have a problem with `t` test cases, and for each one we'll have a number `n`, then `n` strings: `%*d*(%d*%s @)`

If we have a problem with `t` test cases, and for each one we'll have a number `n`, then `n²` numbers: `%*d*(n=%d n*n*%d @)`

## FAQ

### Can it parse all possible inputs?
No, but it can parse almost all inputs from CodeJam.

### How can I do `X`?
Feel free to submit an issue and I'll answer your question and add it to the FAQ.
