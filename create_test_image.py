from PIL import Image, ImageDraw, ImageFont
import os

# Create a new image with white background
width = 800
height = 600
image = Image.new('RGB', (width, height), 'white')
draw = ImageDraw.Draw(image)

# Add text to the image
text_lines = [
    ('OCR Test Document', 50, 50),
    ('This is a sample text document to test OCR functionality.', 50, 100),
    ('It includes multiple lines of text', 50, 150),
    ('with different content.', 50, 200),
    ('Numbers: 123 456 789', 50, 300),
    ('Special characters: @ # $ %', 50, 350)
]

# Use a basic font
for text, x, y in text_lines:
    draw.text((x, y), text, fill='black')

# Save the image
image.save('test_image.png')
