import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image } from 'react-native';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
  images?: string[];
}

export default function ChatBubble({ message, isUser, isLoading = false, images = [] }: ChatBubbleProps) {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const parseInlineStyles = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, index) => {
      const isBold = index % 2 === 1;
      return (
        <Text key={index} style={isBold ? styles.boldText : null}>
          {part}
        </Text>
      );
    });
  };

  const renderMessageContent = () => {
    if (!message) return null;
    const lines = message.split('\n');

    return lines.map((line, index) => {
      const trimmed = line.trim();

      if (trimmed === '') {
        return <View key={index} style={styles.lineSpacer} />;
      }

      if (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith('**:'))) {
        const headerText = trimmed.replace(/^\*\*|\*\*$/g, '').replace(/:$/, '');
        return (
          <Text key={index} style={[styles.headerText, isUser ? styles.userText : styles.botText]}>
            {headerText}
          </Text>
        );
      }

      if (trimmed.startsWith('#')) {
        const headerText = trimmed.replace(/^#+\s*/, '');
        return (
          <Text key={index} style={[styles.headerText, isUser ? styles.userText : styles.botText]}>
            {headerText}
          </Text>
        );
      }

      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const bulletContent = trimmed.replace(/^[\*\-]\s*/, '');
        return (
          <View key={index} style={styles.bulletRow}>
            <Text style={[styles.bulletDot, isUser ? styles.userText : styles.botText]}>•</Text>
            <Text style={[styles.bulletText, isUser ? styles.userText : styles.botText]}>
              {parseInlineStyles(bulletContent)}
            </Text>
          </View>
        );
      }

      return (
        <Text key={index} style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {parseInlineStyles(line)}
        </Text>
      );
    });
  };

  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.botBubble,
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingRow}>
          <Text style={styles.loadingText}>Yazıyor{dots}</Text>
          <ActivityIndicator size="small" color="#EF4444" style={styles.spinner} />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {renderMessageContent()}
          {images && images.length > 0 && (
            <View style={styles.bubbleImagesContainer}>
              {images.map((url, imgIndex) => (
                <Image
                  key={imgIndex}
                  source={{ uri: url }}
                  style={images.length === 1 ? styles.bubbleImageLarge : styles.bubbleImage}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 6,
    marginHorizontal: 12,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#161D30',
    borderColor: '#1F2937',
    borderBottomLeftRadius: 4,
  },
  contentContainer: {
    flexDirection: 'column',
  },
  bubbleImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  bubbleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  bubbleImageLarge: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'System',
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#FFFFFF',
  },
  boldText: {
    fontWeight: 'bold',
  },
  lineSpacer: {
    height: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 6,
    fontFamily: 'System',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 15,
    marginRight: 6,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'System',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6B7280',
    fontFamily: 'System',
  },
  spinner: {
    marginLeft: 8,
  },
});
