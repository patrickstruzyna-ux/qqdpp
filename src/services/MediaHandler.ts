import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import { decode } from 'base64-arraybuffer';

class MediaHandler {
  async compressImage(uri: string): Promise<string> {
    try {
      const result = await ImageResizer.createResizedImage(
        uri,
        800, // max width
        800, // max height
        'JPEG',
        80, // quality
        0, // rotation
      );
      return result.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  }

  async storeMedia(uri: string, type: 'image' | 'video' | 'audio'): Promise<string> {
    const timestamp = Date.now();
    const extension = uri.split('.').pop();
    const fileName = `${type}_${timestamp}.${extension}`;
    const destinationPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.copyFile(uri, destinationPath);
      return destinationPath;
    } catch (error) {
      console.error('Error storing media:', error);
      throw error;
    }
  }

  async deleteMedia(path: string): Promise<void> {
    try {
      await RNFS.unlink(path);
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  }
}

export default new MediaHandler();