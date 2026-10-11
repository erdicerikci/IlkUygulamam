import { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ROWS = 6;
const COLS = 5;
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1QQz0q8epi8b7e9roNA27TKjHKq4WMy75IvKPlSQXplW_2VhClBN8gCG56DzFEeeE8Q/exec';

// Yerel yedek kelime havuzları (Bağlantı gecikirse asla takılmaz)
const FALLBACK_WORDS: { [key: string]: string[] } = {
  'Easy': ['APPLE', 'HOUSE', 'TRAIN', 'WATER', 'BEACH'],
  'Medium': ['PLANT', 'SMILE', 'CHAIR', 'BREAD', 'TRAIN'],
  'Hard': ['GUITAR', 'PLANET', 'STREAM', 'BRIDGE', 'CASTLE']
};

export default function WordleScreen() {
  const [gameState, setGameState] = useState<'difficulty' | 'playing'>('difficulty');
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('Easy');
  
  const [targetWord, setTargetWord] = useState<string>('APPLE');
  const [guesses, setGuesses] = useState<string[]>(['', '', '', '', '', '']);
  const [guessColors, setGuessColors] = useState<string[][]>([
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', '']
  ]);
  const [currentRow, setCurrentRow] = useState<number>(0);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [keyboardColors, setKeyboardColors] = useState<{ [key: string]: string }>({});
  const [startTime, setStartTime] = useState<number>(0);
  
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  const keyboardLayout = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["BACK", "Z", "X", "C", "V", "B", "N", "M", "ENTER"]
  ];

  const startGameWithWord = (word: string) => {
    setTargetWord(word.toUpperCase());
    setGuesses(['', '', '', '', '', '']);
    setGuessColors([
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', '']
    ]);
    setCurrentRow(0);
    setCurrentGuess('');
    setIsGameOver(false);
    setMessage('');
    setKeyboardColors({});
    setStartTime(Date.now());
    setGameState('playing');
  };

  const selectDifficulty = async (diff: string) => {
    setCurrentDifficulty(diff);
    
    // Önce yedek havuzdan hemen başlatalım ki ekran asla takılı kalmasın
    const pool = FALLBACK_WORDS[diff] || FALLBACK_WORDS['Easy'];
    const randomWord = pool[Math.floor(Math.random() * pool.length)];
    startGameWithWord(randomWord);

    // Arka planda Google Sheets'ten güncel kelimeyi çekmeyi deneyelim
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getWords&difficulty=${diff}`);
      const data = await response.json();
      if (data && data.pool && data.pool.length > 0) {
        const netWord = data.pool[Math.floor(Math.random() * data.pool.length)];
        if (netWord) setTargetWord(netWord.toUpperCase());
      }
    } catch (error) {
      // Hata olursa yerel kelimeyle devam eder, oyun donmaz.
    }
  };

  const returnToDifficulty = () => {
    setGameState('difficulty');
    setMessage('');
  };

  const giveUp = () => {
    if (isGameOver) return;
    setIsGameOver(true);
    setMessage(`Kelime şuydu: ${targetWord}`);
  };

  const handleInput = (key: string) => {
    if (isGameOver) return;

    if (key === "ENTER") {
      if (currentGuess.length !== COLS) {
        setMessage("Not enough letters");
        setTimeout(() => setMessage(''), 1500);
        return;
      }

      const updatedGuesses = [...guesses];
      updatedGuesses[currentRow] = currentGuess;
      setGuesses(updatedGuesses);

      let rowColors = ['', '', '', '', ''];
      let targetArray = targetWord.split("");
      let guessArray = currentGuess.split("");

      guessArray.forEach((letter, i) => {
        if (letter === targetArray[i]) {
          rowColors[i] = 'correct';
          targetArray[i] = '_';
          guessArray[i] = '_';
        }
      });

      guessArray.forEach((letter, i) => {
        if (letter !== '_') {
          if (targetArray.includes(letter)) {
            rowColors[i] = 'present';
            targetArray[targetArray.indexOf(letter)] = '_';
          } else {
            rowColors[i] = 'absent';
          }
        }
      });

      const updatedGuessColors = [...guessColors];
      updatedGuessColors[currentRow] = rowColors;
      setGuessColors(updatedGuessColors);

      let newKeyboardColors = { ...keyboardColors };
      currentGuess.split("").forEach((letter, i) => {
        const color = rowColors[i];
        if (color === 'correct') {
          newKeyboardColors[letter] = 'correct';
        } else if (color === 'present' && newKeyboardColors[letter] !== 'correct') {
          newKeyboardColors[letter] = 'present';
        } else if (color === 'absent' && !newKeyboardColors[letter]) {
          newKeyboardColors[letter] = 'absent';
        }
      });
      setKeyboardColors(newKeyboardColors);

      if (currentGuess === targetWord) {
        setIsGameOver(true);
        const timeInSeconds = Math.floor((Date.now() - startTime) / 1000);
        setMessage(`Tebrikler! (${timeInSeconds} sn) 🎉`);
      } else if (currentRow + 1 === ROWS) {
        setIsGameOver(true);
        setMessage(`Oyun Bitti! Kelime: ${targetWord}`);
      } else {
        setCurrentRow(prev => prev + 1);
        setCurrentGuess('');
      }

    } else if (key === "BACK") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else {
      if (currentGuess.length < COLS) {
        setCurrentGuess(prev => prev + key);
      }
    }
  };

  const fetchLeaderboard = async () => {
    setModalVisible(true);
    setLeaderboardData([]);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getLeaderboard&difficulty=${currentDifficulty}`);
      const data = await response.json();
      if (data) {
        setLeaderboardData(data);
      }
    } catch (e) {
      setLeaderboardData([]);
    }
  };

  if (gameState === 'difficulty') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.mainTitle}>ENGLISH WORDLE</Text>
        <View style={styles.diffContainer}>
          <Text style={styles.diffTitle}>SELECT DIFFICULTY</Text>
          <TouchableOpacity style={[styles.diffBtn, styles.btnEasy]} onPress={() => selectDifficulty('Easy')}>
            <Text style={styles.btnText}>Easy (A1-B2)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.diffBtn, styles.btnMedium]} onPress={() => selectDifficulty('Medium')}>
            <Text style={styles.btnText}>Medium (A1-C1)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.diffBtn, styles.btnHard]} onPress={() => selectDifficulty('Hard')}>
            <Text style={styles.btnText}>Hard (All Levels)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={returnToDifficulty}>
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WORDLE</Text>
        <TouchableOpacity style={styles.iconButton} onPress={fetchLeaderboard}>
          <Text style={styles.iconText}>🏆</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.messageText}>{message}</Text>

      <View style={styles.gridContainer}>
        {Array.from({ length: ROWS }).map((_, rowIndex) => {
          const guess = rowIndex === currentRow ? currentGuess : (guesses[rowIndex] || '');
          
          return (
            <View key={rowIndex} style={styles.row}>
              {Array.from({ length: COLS }).map((_, colIndex) => {
                const letter = guess[colIndex] || '';
                const status = rowIndex < currentRow ? guessColors[rowIndex][colIndex] : 'normal';
                
                return (
                  <View 
                    key={colIndex} 
                    style={[
                      styles.cell, 
                      status === 'correct' && styles.correct,
                      status === 'present' && styles.present,
                      status === 'absent' && styles.absent,
                    ]}
                  >
                    <Text style={styles.cellText}>{letter}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.actionContainer}>
        {!isGameOver ? (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.giveUpBtn} onPress={giveUp}>
              <Text style={styles.btnText}>Give Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.levelBtn} onPress={returnToDifficulty}>
              <Text style={styles.btnText}>Level</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.playAgainBtn} onPress={() => selectDifficulty(currentDifficulty)}>
              <Text style={styles.btnText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.levelBtn} onPress={returnToDifficulty}>
              <Text style={styles.btnText}>Level</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.keyboardContainer}>
        {keyboardLayout.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyboardRow}>
            {row.map((key) => {
              const colorClass = keyboardColors[key];
              const isEnter = key === 'ENTER';
              
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.keyButton, 
                    (key === 'ENTER' || key === 'BACK') && styles.wideKey,
                    isEnter && styles.enterKeyButton,
                    colorClass === 'correct' && styles.keyCorrect,
                    colorClass === 'present' && styles.keyPresent,
                    colorClass === 'absent' && styles.keyAbsent,
                  ]}
                  onPress={() => handleInput(key)}
                >
                  <Text style={[styles.keyText, isEnter && styles.enterKeyText]}>
                    {key === 'BACK' ? '⌫' : key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Top 10 Players ({currentDifficulty})</Text>
            {leaderboardData.length === 0 ? (
              <Text style={styles.modalBody}>Yükleniyor veya skor bulunamadı...</Text>
            ) : (
              leaderboardData.map((row, index) => (
                <Text key={index} style={styles.modalBody}>
                  #{index + 1} {row[0]} - {row[1]} deneme ({row[2]} sn)
                </Text>
              ))
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121213', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: 40, 
    paddingBottom: 10 
  },
  mainTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 40 },
  diffContainer: { width: '85%', justifyContent: 'center', gap: 15, flex: 1 },
  diffTitle: { color: '#818384', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  diffBtn: { padding: 16, borderRadius: 6, alignItems: 'center' },
  btnEasy: { backgroundColor: '#538d4e' },
  btnMedium: { backgroundColor: '#e67e22' },
  btnHard: { backgroundColor: '#d11a2a' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%', 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#3a3a3c', 
    paddingBottom: 12 
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  iconButton: { padding: 4 },
  iconText: { fontSize: 20 },
  messageText: { height: 24, color: '#ff6666', fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
  gridContainer: { marginVertical: 5 },
  row: { flexDirection: 'row', marginBottom: 6 },
  cell: { width: 48, height: 48, borderWidth: 2, borderColor: '#3a3a3c', margin: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121213', borderRadius: 4 },
  correct: { backgroundColor: '#538d4e', borderColor: '#538d4e' },
  present: { backgroundColor: '#b59f3b', borderColor: '#b59f3b' },
  absent: { backgroundColor: '#3a3a3c', borderColor: '#3a3a3c' },
  cellText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  actionContainer: { height: 40, justifyContent: 'center', alignItems: 'center', marginVertical: 5 },
  btnRow: { flexDirection: 'row', gap: 10 },
  giveUpBtn: { backgroundColor: '#b59f3b', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  levelBtn: { backgroundColor: '#3a3a3c', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  playAgainBtn: { backgroundColor: '#538d4e', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  keyboardContainer: { width: '100%', paddingHorizontal: 6, alignItems: 'center', marginBottom: 5 },
  keyboardRow: { flexDirection: 'row', marginBottom: 6, justifyContent: 'center', width: '100%' },
  keyButton: { backgroundColor: '#818384', paddingVertical: 14, margin: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flex: 1 },
  wideKey: { flex: 1.5, backgroundColor: '#565758' },
  enterKeyButton: { backgroundColor: '#4b8ee2' },
  keyCorrect: { backgroundColor: '#538d4e' },
  keyPresent: { backgroundColor: '#b59f3b' },
  keyAbsent: { backgroundColor: '#3a3a3c' },
  keyText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  enterKeyText: { fontSize: 11 },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#121213', borderWidth: 1, borderColor: '#3a3a3c', borderRadius: 8, padding: 25, width: '85%', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalBody: { color: '#aaa', fontSize: 14, marginBottom: 10, textAlign: 'center' },
  closeBtn: { backgroundColor: '#3a3a3c', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 4, marginTop: 10 }
});