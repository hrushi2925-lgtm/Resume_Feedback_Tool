require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');

const app = express();
const PORT = 3000;

app.use(cors());

const upload = multer({ dest: 'uploads/' });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload a PDF resume.'
      });
    }

    filePath = req.file.path;

    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    const resumeText = data.text.trim();

    if (!resumeText) {
      return res.status(400).json({
        message: 'Could not extract any text from this PDF.'
      });
    }

    console.log('Resume text extracted.');
    console.log('Text length:', resumeText.length);

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `You are an expert resume reviewer and career advisor.

Analyze the resume provided by the user.

Give practical, honest and specific feedback. Do not invent experience, skills, education, or achievements that are not present in the resume.

Cover:
1. Overall score out of 100
2. Summary
3. Strengths
4. Weaknesses
5. ATS friendliness
6. Skills
7. Projects and experience
8. Education
9. Formatting
10. Specific actionable improvements
11. Final recommendation

Make the feedback useful for someone applying to software engineering internships.`
        },
        {
          role: 'user',
          content: `Analyze this resume:

${resumeText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    });

    const feedback = completion.choices[0]?.message?.content;

    if (!feedback) {
      throw new Error('Groq returned an empty response.');
    }

    res.json({
      message: 'Resume analyzed successfully!',
      feedback: feedback
    });

  } catch (error) {
    console.error('Error processing resume:', error);

    res.status(500).json({
      message: 'Something went wrong while analyzing the resume.'
    });

  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});