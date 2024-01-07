<?
	$str1 = file_get_contents("AllLevels.txt");
	$str2 = file_get_contents("AllLevelsComplete.txt");
	$lines1 = explode("\n", $str1);
	$lines2 = explode("\n", $str2);
	
	//echo $lines1[0].'<br>'.$lines2[0];

	$levels = array();
	$count = count($lines2);

	for($i=0; $i<$count; $i++){
		$str1 = $lines1[$i+3];
		$str2 = $lines2[$i];
		$tokens1 = explode(' ', $str1);
		$tokens2 = explode(' ', $str2);
		$level = new stdClass;
		
		$level->num = intval($tokens1[0]);
		$level->size = intval($tokens1[1]);
		$level->minMove = intval($tokens1[2]);
		$ballPos = new stdClass;
		$ballPos->x = floatval($tokens1[3]);
		$ballPos->y = floatval($tokens1[4]);
		$ballPos->z = floatval($tokens1[5]);
		$level->ballPos = $ballPos;
		$cupPos = new stdClass;
		$cupPos->x = floatval($tokens1[6]);
		$cupPos->y = floatval($tokens1[7]);
		$cupPos->z = floatval($tokens1[8]);
		$level->cupPos = $cupPos;
		$pipes = array();
		$complete = array();
		$total = count($tokens1);
		for($j=9; $j<$total; $j++){
			$pipes[] = intval($tokens1[$j]);
			$complete[] = intval($tokens2[$j]);
		}
		$level->start = $pipes;
		$level->complete = $complete;
		$levels[] = $level;
	}
	
	echo json_encode($levels);
?>