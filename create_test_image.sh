#!/bin/bash

# Create a test image with some text
convert -size 800x600 xc:white \
  -font Helvetica -pointsize 24 \
  -draw "text 50,50 'OCR Test Document'" \
  -draw "text 50,100 'This is a sample text document to test OCR functionality.'" \
  -draw "text 50,150 'It includes multiple lines of text'" \
  -draw "text 50,200 'with different content.'" \
  -draw "text 50,300 'Numbers: 123 456 789'" \
  -draw "text 50,350 'Special characters: @ # $ %'" \
  test_image.png
