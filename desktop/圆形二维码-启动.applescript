on run
	set mainApp to (path to home folder as text) & "Desktop:圆形二维码生成.app"
	try
		do shell script "xattr -cr $HOME/Desktop/圆形二维码生成.app 2>/dev/null; open -a $HOME/Desktop/圆形二维码生成.app"
	on error errMsg
		display dialog "启动失败：" & errMsg buttons {"好"} default button 1 with icon caution
	end try
end run
