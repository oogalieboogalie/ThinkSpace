import { invoke } from '@tauri-apps/api/tauri';

/**
 * Enhanced Visual Storyteller that generates actual images
 * This can be integrated into your Agent Orchestration system
 */

export interface VisualGenerationRequest {
  task: string;
  curriculumContext?: string;
  apiKey: string;
}

export interface VisualStorytellerOutput {
  mentalModel: string;
  analogies: string[];
  diagrams: string;
  generatedImageUrl?: string;
  imagePrompt: string;
}

export async function executeVisualStoryteller(
  request: VisualGenerationRequest
): Promise<VisualStorytellerOutput> {
  const { task, curriculumContext, apiKey } = request;

  // Build prompt for the text-based visual explanation
  const visualPrompt = `You are a Visual Storyteller specializing in making complex concepts clear through visuals.

Task: ${task}

${curriculumContext ? `Context from curriculum:\n${curriculumContext}\n\n` : ''}

Please provide:
1. A clear mental model or analogy (like a tree, building blocks, etc.)
2. 2-3 simple analogies
3. A simple text-based diagram using ASCII art
4. Describe what visual image would best illustrate this concept

Format your response as JSON with these keys:
{
  "mentalModel": "...",
  "analogies": ["...", "..."],
  "diagram": "...",
  "imageDescription": "detailed description of what visual image to generate"
}`;

  // Get visual explanation from MiniMax text API
  const textResponse = await invoke('chat_with_minimax', {
    apiKey,
    messages: [
      { role: 'user', content: visualPrompt }
    ]
  }) as string;

  // Parse the response
  let visualExplanation: Partial<VisualStorytellerOutput>;
  try {
    visualExplanation = JSON.parse(textResponse);
  } catch {
    // Fallback if parsing fails
    visualExplanation = {
      mentalModel: textResponse.substring(0, 200),
      analogies: [],
      diagrams: '',
      imagePrompt: `An educational diagram illustrating ${task}`
    };
  }

  // Generate an actual image
  let imageUrl: string | undefined;
  try {
    const imagePrompt = `Educational illustration: ${visualExplanation.imagePrompt || task}. Clean, simple, educational style, white or light background, clear labels, professional diagram style`;

    imageUrl = await invoke('generate_image_minimax', {
      apiKey,
      prompt: imagePrompt
    }) as string;
  } catch (error) {
    console.error('Failed to generate image:', error);
    // Continue without image if generation fails
  }

  return {
    mentalModel: visualExplanation.mentalModel || '',
    analogies: visualExplanation.analogies || [],
    diagrams: visualExplanation.diagrams || '',
    generatedImageUrl: imageUrl,
    imagePrompt: visualExplanation.imagePrompt || task
  };
}

// Usage example:
// const result = await executeVisualStoryteller({
//   task: "Explain how React useState works",
//   curriculumContext: "Student is learning React basics",
//   apiKey: "your-api-key"
// });
//
// console.log(result.mentalModel);
// console.log(result.generatedImageUrl); // <-- Real image URL!
